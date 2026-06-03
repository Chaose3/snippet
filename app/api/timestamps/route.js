import { NextResponse } from "next/server";
import { redis } from "../../../lib/db";
import { readTrackEntry, serializeTrackEntry, trackMetaFromSource } from "../../../lib/snippet-track-storage";

const MAX_SNIPPETS_PER_TRACK = 3;

async function resolveUserId(authHeader) {
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.id ?? null;
}

function redisKey(userId) {
  return `ts:${userId}`;
}

// GET /api/timestamps — { timestamps: { [trackId]: [...] }, trackMeta: { [trackId]: { name, artists, ... } } }
export async function GET(request) {
  const userId = await resolveUserId(request.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await redis.hgetall(redisKey(userId));
  if (!all) return NextResponse.json({ timestamps: {}, trackMeta: {} });

  const timestamps = {};
  const trackMeta = {};
  for (const [trackId, val] of Object.entries(all)) {
    const { timestamps: tss, meta } = readTrackEntry(val);
    if (tss.length > 0) timestamps[trackId] = tss;
    if (meta?.name) trackMeta[trackId] = meta;
  }
  return NextResponse.json({ timestamps, trackMeta });
}

// POST /api/timestamps — body: { trackId, positionMs, label, trackMeta? }
export async function POST(request) {
  const userId = await resolveUserId(request.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackId, positionMs, label, trackMeta: incomingMeta } = await request.json();
  if (!trackId || positionMs == null) {
    return NextResponse.json({ error: "Missing trackId or positionMs" }, { status: 400 });
  }

  const existing = await redis.hget(redisKey(userId), trackId);
  const { timestamps, meta: existingMeta } = readTrackEntry(existing);
  const meta = trackMetaFromSource(incomingMeta) ?? existingMeta;

  if (timestamps.length >= MAX_SNIPPETS_PER_TRACK) {
    return NextResponse.json(
      {
        error: "MAX_SNIPPETS_REACHED",
        detail: `You can save up to ${MAX_SNIPPETS_PER_TRACK} snippets per song.`,
      },
      { status: 400 }
    );
  }

  timestamps.push({ positionMs, label: label || null, createdAt: new Date().toISOString() });
  timestamps.sort((a, b) => a.positionMs - b.positionMs);

  await redis.hset(redisKey(userId), {
    [trackId]: serializeTrackEntry(timestamps, meta),
  });
  return NextResponse.json(timestamps);
}

// PATCH /api/timestamps — body: { trackId, index, label }
export async function PATCH(request) {
  const userId = await resolveUserId(request.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackId, index, label } = await request.json();
  if (!trackId || index == null) {
    return NextResponse.json({ error: "Missing trackId or index" }, { status: 400 });
  }

  const existing = await redis.hget(redisKey(userId), trackId);
  const { timestamps, meta } = readTrackEntry(existing);

  if (index < 0 || index >= timestamps.length) {
    return NextResponse.json({ error: "Index out of range" }, { status: 400 });
  }

  timestamps[index].label = label || null;

  await redis.hset(redisKey(userId), { [trackId]: serializeTrackEntry(timestamps, meta) });
  return NextResponse.json(timestamps);
}

// DELETE /api/timestamps — body: { trackId, index } or { trackId, deleteAll: true }
export async function DELETE(request) {
  const userId = await resolveUserId(request.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackId, index, deleteAll } = await request.json();
  if (!trackId) {
    return NextResponse.json({ error: "Missing trackId" }, { status: 400 });
  }

  if (deleteAll) {
    await redis.hdel(redisKey(userId), trackId);
    return NextResponse.json([]);
  }

  if (index == null) {
    return NextResponse.json({ error: "Missing index or deleteAll" }, { status: 400 });
  }

  const existing = await redis.hget(redisKey(userId), trackId);
  const { timestamps, meta } = readTrackEntry(existing);

  timestamps.splice(index, 1);

  if (timestamps.length === 0) {
    await redis.hdel(redisKey(userId), trackId);
  } else {
    await redis.hset(redisKey(userId), { [trackId]: serializeTrackEntry(timestamps, meta) });
  }
  return NextResponse.json(timestamps);
}
