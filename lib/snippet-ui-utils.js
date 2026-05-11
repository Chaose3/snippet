/** Max saved snippets per track (must match API validation). */
export const MAX_SNIPPETS_PER_TRACK = 3;

export function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

export function describeArcPath(cx, cy, r, startAngleDeg, endAngleDeg) {
  const start = polarToCartesian(cx, cy, r, startAngleDeg);
  const end = polarToCartesian(cx, cy, r, endAngleDeg);
  const angleDiff = ((endAngleDeg - startAngleDeg) % 360 + 360) % 360;
  const largeArcFlag = angleDiff > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function trackFromPlayerSnapshot(state) {
  if (!state?.id || !state?.uri) return null;
  return {
    id: state.id,
    name: state.name,
    uri: state.uri,
    artists: state.artists,
    albumArt: state.albumArt,
    durationMs: state.durationMs,
  };
}
