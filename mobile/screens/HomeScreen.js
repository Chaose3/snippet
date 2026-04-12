import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { getItem, saveItem, clearTokens } from '../lib/storage';
import { refreshAccessToken } from '../lib/auth';
import {
  playSnippet,
  getPlayerState,
  getUserPlaylists,
  getPlaylistTracks,
  getLikedTracks,
  setShuffle,
  pausePlayback,
  resumePlayback,
  setVolume,
  seekToPosition,
} from '../lib/snippet';
import {
  fetchAllTimestamps,
  saveTimestamp,
  deleteTimestamp,
  formatMs,
} from '../lib/timestamps';

export default function HomeScreen({ token: initialToken, onLogout, onTokenRefresh }) {
  const [token, setToken] = useState(initialToken);

  // Now Playing
  const [playerState, setPlayerState] = useState(null);
  const [estimatedPos, setEstimatedPos] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [volume, setVolumeState] = useState(null);
  const lastPollRef = useRef(null);

  // Timestamps
  const [allTimestamps, setAllTimestamps] = useState({});
  const [labelInput, setLabelInput] = useState('');

  // Library
  const [playlists, setPlaylists] = useState([]);
  const [openPlaylistId, setOpenPlaylistId] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState({});
  const [loadingPlaylistId, setLoadingPlaylistId] = useState(null);
  const [likedOpen, setLikedOpen] = useState(false);
  const [likedTracks, setLikedTracks] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Track detail modal
  const [selectedTrack, setSelectedTrack] = useState(null);

  // ── Token helpers ────────────────────────────────────────────────────────────

  const getToken = useCallback(async () => {
    return getItem('spotify_access_token');
  }, []);

  const doRefresh = useCallback(async () => {
    const refreshToken = await getItem('spotify_refresh_token');
    if (!refreshToken) return null;
    try {
      const data = await refreshAccessToken(refreshToken);
      const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
      await saveItem('spotify_access_token', data.access_token);
      await saveItem('spotify_token_expires_at', String(expiresAt));
      if (data.refresh_token) await saveItem('spotify_refresh_token', data.refresh_token);
      setToken(data.access_token);
      onTokenRefresh?.(data.access_token);
      return data.access_token;
    } catch (err) {
      console.warn('[doRefresh] failed:', err.message);
      return null;
    }
  }, [onTokenRefresh]);

  // Proactive refresh 5 minutes before expiry
  useEffect(() => {
    if (!token) return;
    let id;
    getItem('spotify_token_expires_at').then((v) => {
      if (!v) return;
      const ms = Number(v) - Date.now() - 5 * 60 * 1000;
      if (ms <= 0) { doRefresh(); return; }
      id = setTimeout(() => doRefresh(), ms);
    });
    return () => clearTimeout(id);
  }, [token, doRefresh]);

  // ── Spotify polling ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    const poll = async () => {
      const state = await getPlayerState(token);
      if (state) {
        setPlayerState(state);
        if (!isSeeking) setEstimatedPos(state.positionMs);
        lastPollRef.current = {
          time: Date.now(),
          positionMs: state.positionMs,
          isPlaying: state.isPlaying,
        };
      } else {
        setPlayerState(null);
        lastPollRef.current = null;
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [token]);

  // Smooth position estimate between polls
  useEffect(() => {
    const id = setInterval(() => {
      if (isSeeking) return;
      if (!lastPollRef.current?.isPlaying) return;
      const elapsed = Date.now() - lastPollRef.current.time;
      setEstimatedPos(lastPollRef.current.positionMs + elapsed);
    }, 500);
    return () => clearInterval(id);
  }, [isSeeking]);

  // Sync volume from player state on first load
  useEffect(() => {
    if (playerState?.volumePercent != null && volume === null) {
      setVolumeState(playerState.volumePercent);
    }
  }, [playerState?.volumePercent, volume]);

  // ── Timestamps ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) { setAllTimestamps({}); return; }
    fetchAllTimestamps(token).then(setAllTimestamps);
  }, [token]);

  // ── Library ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token || playlists.length > 0) return;
    getUserPlaylists(token).then(setPlaylists);
  }, [token]);

  // Eagerly load everything when searching
  useEffect(() => {
    if (!searchQuery || !token) return;
    if (likedTracks === null) getLikedTracks(token).then(setLikedTracks);
    playlists.forEach((pl) => {
      if (!playlistTracks[pl.id]) {
        getPlaylistTracks(token, pl.id).then((tracks) =>
          setPlaylistTracks((prev) => ({ ...prev, [pl.id]: tracks }))
        );
      }
    });
  }, [searchQuery, token, playlists]);

  // ── Playback ─────────────────────────────────────────────────────────────────

  const jump = useCallback(async (trackUri, positionMs) => {
    if (!trackUri || trackUri.startsWith('spotify:local:')) return;
    const t = await getToken();
    if (!t) return;

    const res = await playSnippet(t, { trackUri, positionMs });

    if (res.status === 204 || res.ok) {
      lastPollRef.current = { time: Date.now(), positionMs, isPlaying: true };
      setEstimatedPos(positionMs);
      return;
    }
    if (res.status === 401) {
      const newToken = await doRefresh();
      if (!newToken) { handleLogout(); return; }
      const retry = await playSnippet(newToken, { trackUri, positionMs });
      if (retry.status === 204 || retry.ok) {
        lastPollRef.current = { time: Date.now(), positionMs, isPlaying: true };
        setEstimatedPos(positionMs);
      }
      return;
    }
    if (res.status === 404) {
      Alert.alert('No active device', 'Open Spotify on any device and start playing something first, then try again.');
      return;
    }
    if (res.status === 403) {
      Alert.alert('Premium required', 'Spotify Premium is required for playback control.');
      return;
    }
  }, [getToken, doRefresh]);

  const handlePlayPause = useCallback(async () => {
    const t = await getToken();
    if (!t || !playerState) return;
    if (playerState.isPlaying) {
      await pausePlayback(t);
      setPlayerState((prev) => prev ? { ...prev, isPlaying: false } : prev);
      if (lastPollRef.current) lastPollRef.current.isPlaying = false;
    } else {
      await resumePlayback(t);
      setPlayerState((prev) => prev ? { ...prev, isPlaying: true } : prev);
      if (lastPollRef.current) {
        lastPollRef.current.isPlaying = true;
        lastPollRef.current.time = Date.now();
      }
    }
  }, [playerState, getToken]);

  const handleSeekComplete = useCallback(async (val) => {
    const posMs = Math.round(val);
    setEstimatedPos(posMs);
    setIsSeeking(false);
    const t = await getToken();
    if (t) await seekToPosition(t, posMs);
    if (lastPollRef.current) {
      lastPollRef.current.positionMs = posMs;
      lastPollRef.current.time = Date.now();
    }
  }, [getToken]);

  const handleVolumeChange = useCallback(async (val) => {
    const vol = Math.round(val);
    setVolumeState(vol);
    const t = await getToken();
    if (t) await setVolume(t, vol);
  }, [getToken]);

  const handleShuffle = useCallback(async () => {
    const t = await getToken();
    if (!t || !playerState) return;
    const next = !playerState.shuffle;
    await setShuffle(t, next);
    setPlayerState((prev) => prev ? { ...prev, shuffle: next } : prev);
  }, [playerState, getToken]);

  // ── Timestamps actions ───────────────────────────────────────────────────────

  const handleSaveTimestamp = useCallback(async () => {
    if (!playerState) return;
    const t = await getToken();
    if (!t) return;
    const label = labelInput.trim() || null;
    const updated = await saveTimestamp(t, playerState.id, Math.floor(estimatedPos), label);
    if (updated) setAllTimestamps((prev) => ({ ...prev, [playerState.id]: updated }));
    setLabelInput('');
  }, [playerState, estimatedPos, labelInput, getToken]);

  const handleDelete = useCallback(async (trackId, index) => {
    const t = await getToken();
    if (!t) return;
    const updated = await deleteTimestamp(t, trackId, index);
    setAllTimestamps((prev) => {
      const next = { ...prev };
      if (updated && updated.length > 0) next[trackId] = updated;
      else delete next[trackId];
      return next;
    });
  }, [getToken]);

  // ── Library toggles ──────────────────────────────────────────────────────────

  const handleToggleLiked = useCallback(async () => {
    setLikedOpen((o) => !o);
    if (likedTracks !== null) return;
    const t = await getToken();
    if (!t) return;
    const tracks = await getLikedTracks(t);
    setLikedTracks(tracks);
  }, [likedTracks, getToken]);

  const handleTogglePlaylist = useCallback(async (playlistId) => {
    if (openPlaylistId === playlistId) { setOpenPlaylistId(null); return; }
    setOpenPlaylistId(playlistId);
    if (playlistTracks[playlistId]) return;
    const t = await getToken();
    if (!t) return;
    setLoadingPlaylistId(playlistId);
    const tracks = await getPlaylistTracks(t, playlistId);
    setPlaylistTracks((prev) => ({ ...prev, [playlistId]: tracks }));
    setLoadingPlaylistId(null);
  }, [openPlaylistId, playlistTracks, getToken]);

  // ── Auth ─────────────────────────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    await clearTokens();
    onLogout();
  }, [onLogout]);

  // ── Render helpers ───────────────────────────────────────────────────────────

  const nowPlayingTimestamps = playerState ? (allTimestamps[playerState.id] || []) : [];

  const renderTrackRow = useCallback((track, showChips = true) => {
    const tss = allTimestamps[track.id] || [];
    return (
      <TouchableOpacity
        key={track.id}
        style={styles.trackRow}
        onPress={() => setSelectedTrack(track)}
        activeOpacity={0.7}
      >
        <View style={styles.trackLeft}>
          {track.albumArt
            ? <Image source={{ uri: track.albumArt }} style={styles.trackArt} />
            : <View style={styles.trackArtFallback} />}
          <View style={styles.trackMeta}>
            <Text style={styles.trackRowName} numberOfLines={1}>{track.name}</Text>
            <Text style={styles.trackRowArtist} numberOfLines={1}>{track.artists}</Text>
            {showChips && tss.length > 0 && (
              <View style={styles.chipRow}>
                {tss.map((ts, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.chip}
                    onPress={() => jump(track.uri, ts.positionMs)}
                  >
                    <Text style={styles.chipText} numberOfLines={1}>
                      {ts.label || formatMs(ts.positionMs)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={styles.trackRight}>
          <Text style={styles.trackDuration}>{formatMs(track.durationMs)}</Text>
          <TouchableOpacity
            style={styles.playTrackBtn}
            onPress={() => jump(track.uri, 0)}
          >
            <Text style={styles.playTrackBtnText}>▶</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [allTimestamps, jump]);

  const filterTracks = (tracks) => {
    if (!searchQuery) return tracks;
    const q = searchQuery.toLowerCase();
    return tracks.filter(
      (t) => t.name.toLowerCase().includes(q) || t.artists.toLowerCase().includes(q)
    );
  };

  // ── Track detail modal ───────────────────────────────────────────────────────

  const renderModal = () => {
    if (!selectedTrack) return null;
    const isCurrentTrack = playerState?.id === selectedTrack.id;
    const tss = allTimestamps[selectedTrack.id] || [];
    const progress = isCurrentTrack && playerState.durationMs > 0
      ? estimatedPos / playerState.durationMs
      : 0;

    return (
      <Modal
        visible={!!selectedTrack}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTrack(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedTrack(null)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setSelectedTrack(null)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedTrack.name}</Text>
                <View style={{ width: 28 }} />
              </View>

              {selectedTrack.albumArt
                ? <Image source={{ uri: selectedTrack.albumArt }} style={styles.modalArt} />
                : <View style={[styles.modalArt, styles.modalArtFallback]} />}

              <Text style={styles.modalTrackName}>{selectedTrack.name}</Text>
              <Text style={styles.modalArtist}>{selectedTrack.artists}</Text>

              {isCurrentTrack ? (
                <View style={styles.modalControls}>
                  <Slider
                    style={styles.modalSeek}
                    minimumValue={0}
                    maximumValue={playerState.durationMs}
                    value={estimatedPos}
                    onSlidingStart={() => setIsSeeking(true)}
                    onSlidingComplete={handleSeekComplete}
                    minimumTrackTintColor="#ff5500"
                    maximumTrackTintColor="#2a2a3a"
                    thumbTintColor="#ff5500"
                  />
                  <View style={styles.modalTimes}>
                    <Text style={styles.timeText}>{formatMs(estimatedPos)}</Text>
                    <Text style={styles.timeText}>{formatMs(playerState.durationMs)}</Text>
                  </View>
                  <TouchableOpacity style={styles.modalPlayPause} onPress={handlePlayPause}>
                    <Text style={styles.modalPlayPauseText}>
                      {playerState.isPlaying ? '❙❙' : '▶'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.modalPlayFromStartWrap}
                  onPress={() => { jump(selectedTrack.uri, 0); setSelectedTrack(null); }}
                >
                  <LinearGradient
                    colors={['#ff5500', '#7b31c7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalPlayFromStart}
                  >
                    <Text style={styles.modalPlayFromStartText}>▶  Play</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <ScrollView style={styles.modalTimestamps} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTsHeading}>
                  {tss.length > 0 ? 'Saved Moments' : 'No saved moments yet'}
                </Text>
                {tss.map((ts, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.modalTsRow}
                    onPress={() => { jump(selectedTrack.uri, ts.positionMs); setSelectedTrack(null); }}
                  >
                    <Text style={styles.modalTsIcon}>▶</Text>
                    <Text style={styles.modalTsLabel} numberOfLines={1}>
                      {ts.label || 'Moment'}
                    </Text>
                    <Text style={styles.modalTsTime}>{formatMs(ts.positionMs)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Image source={require('../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>

          {/* Now Playing */}
          {!playerState ? (
            <Text style={styles.muted}>Nothing playing — open Spotify and start a track.</Text>
          ) : (
            <View style={styles.card}>
              <LinearGradient
                colors={['#ff5500', '#7b31c7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardGradientBar}
              />
              <View style={styles.cardInner}>
                {/* Album art + track info */}
                <View style={styles.nowPlaying}>
                  {playerState.albumArt
                    ? <Image source={{ uri: playerState.albumArt }} style={styles.albumArt} />
                    : <View style={[styles.albumArt, styles.albumArtFallback]} />}
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackName} numberOfLines={1}>{playerState.name}</Text>
                    <Text style={styles.artist} numberOfLines={1}>{playerState.artists}</Text>
                    <Slider
                      style={styles.seekSlider}
                      minimumValue={0}
                      maximumValue={playerState.durationMs}
                      value={estimatedPos}
                      onSlidingStart={() => setIsSeeking(true)}
                      onSlidingComplete={handleSeekComplete}
                      minimumTrackTintColor="#ff5500"
                      maximumTrackTintColor="#2a2a3a"
                      thumbTintColor="#ff5500"
                    />
                    <View style={styles.timesRow}>
                      <Text style={styles.timeText}>{formatMs(estimatedPos)}</Text>
                      <TouchableOpacity onPress={handleShuffle} style={styles.shuffleBtn}>
                        <Text style={[styles.shuffleText, playerState.shuffle && styles.shuffleOn]}>
                          ⇄
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.timeText}>{formatMs(playerState.durationMs)}</Text>
                    </View>
                  </View>
                </View>

                {/* Controls */}
                <View style={styles.controls}>
                  <TouchableOpacity style={styles.playPauseBtn} onPress={handlePlayPause}>
                    <Text style={styles.playPauseBtnText}>
                      {playerState.isPlaying ? '❙❙' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.volumeRow}>
                    <Text style={styles.volumeIcon}>🔈</Text>
                    <Slider
                      style={styles.volumeSlider}
                      minimumValue={0}
                      maximumValue={100}
                      value={volume ?? 50}
                      onSlidingComplete={handleVolumeChange}
                      minimumTrackTintColor="#ff5500"
                      maximumTrackTintColor="#2a2a3a"
                      thumbTintColor="#ff5500"
                    />
                    <Text style={styles.volumeLabel}>{Math.round(volume ?? 50)}%</Text>
                  </View>
                </View>

                {/* Save moment */}
                <View style={styles.saveRow}>
                  <TextInput
                    style={styles.input}
                    placeholder={`Label (optional) — at ${formatMs(estimatedPos)}`}
                    placeholderTextColor="#555570"
                    value={labelInput}
                    onChangeText={setLabelInput}
                    onSubmitEditing={handleSaveTimestamp}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={handleSaveTimestamp} style={styles.saveBtnWrap}>
                    <LinearGradient
                      colors={['#ff5500', '#7b31c7']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.saveBtn}
                    >
                      <Text style={styles.saveBtnText}>Save moment</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Timestamps for current track */}
                {nowPlayingTimestamps.length > 0 ? (
                  <View style={styles.tsList}>
                    {nowPlayingTimestamps.map((ts, i) => (
                      <View key={i} style={styles.tsItem}>
                        <TouchableOpacity
                          style={styles.jumpBtn}
                          onPress={() => jump(playerState.uri, ts.positionMs)}
                        >
                          <Text style={styles.playIcon}>▶</Text>
                          <Text style={styles.tsLabel} numberOfLines={1}>
                            {ts.label || formatMs(ts.positionMs)}
                          </Text>
                        </TouchableOpacity>
                        <Text style={styles.tsTime}>{formatMs(ts.positionMs)}</Text>
                        <TouchableOpacity
                          onPress={() => handleDelete(playerState.id, i)}
                          style={styles.deleteBtn}
                        >
                          <Text style={styles.deleteBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.muted, { marginTop: 8, fontSize: 13 }]}>
                    No saved moments for this song yet.
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Library */}
          <View style={styles.librarySection}>
            <Text style={styles.libraryLabel}>Your Library</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search library…"
              placeholderTextColor="#555570"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* Liked Songs */}
            <View style={styles.playlistWrap}>
              <TouchableOpacity style={styles.playlistRow} onPress={handleToggleLiked}>
                <View style={styles.likedArt}>
                  <Text style={styles.likedArtText}>♥</Text>
                </View>
                <View style={styles.playlistMeta}>
                  <Text style={styles.playlistName}>Liked Songs</Text>
                  {likedTracks !== null && (
                    <Text style={styles.playlistCount}>{likedTracks.length} tracks</Text>
                  )}
                </View>
                <Text style={styles.chevron}>{likedOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {(likedOpen || searchQuery.length > 0) && (
                <View style={styles.trackList}>
                  {likedTracks === null
                    ? <ActivityIndicator color="#ff5500" style={{ padding: 16 }} />
                    : likedTracks.length === 0
                    ? <Text style={[styles.muted, { padding: 12 }]}>No liked songs found.</Text>
                    : filterTracks(likedTracks).map((t) => renderTrackRow(t))}
                </View>
              )}
            </View>

            {/* Playlists */}
            {playlists.length === 0 ? (
              <ActivityIndicator color="#ff5500" style={{ marginTop: 16 }} />
            ) : (
              playlists
                .filter((pl) => !searchQuery || pl.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((pl) => {
                  const isOpen = openPlaylistId === pl.id;
                  const tracks = filterTracks(playlistTracks[pl.id] || []);
                  const loading = loadingPlaylistId === pl.id;

                  return (
                    <View key={pl.id} style={styles.playlistWrap}>
                      <TouchableOpacity
                        style={styles.playlistRow}
                        onPress={() => handleTogglePlaylist(pl.id)}
                      >
                        {pl.coverArt
                          ? <Image source={{ uri: pl.coverArt }} style={styles.playlistArt} />
                          : <View style={[styles.playlistArt, styles.playlistArtFallback]} />}
                        <View style={styles.playlistMeta}>
                          <Text style={styles.playlistName} numberOfLines={1}>{pl.name}</Text>
                          <Text style={styles.playlistCount}>{pl.trackCount} tracks</Text>
                        </View>
                        <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                      </TouchableOpacity>

                      {(isOpen || searchQuery.length > 0) && (
                        <View style={styles.trackList}>
                          {loading
                            ? <ActivityIndicator color="#ff5500" style={{ padding: 16 }} />
                            : tracks.length === 0
                            ? <Text style={[styles.muted, { padding: 12 }]}>
                                {searchQuery ? 'No matches.' : 'No tracks found.'}
                              </Text>
                            : tracks.map((t) => renderTrackRow(t))}
                        </View>
                      )}
                    </View>
                  );
                })
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderModal()}
    </SafeAreaView>
  );
}

const ORANGE = '#ff5500';
const PURPLE = '#7b31c7';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a10' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    marginBottom: 20,
  },
  headerLogo: { width: 120, height: 32, tintColor: '#f0f0f5' },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: { color: '#aaaacc', fontSize: 13 },

  muted: { color: '#6b6b88', fontSize: 14, lineHeight: 22, marginBottom: 16 },

  // Card
  card: {
    backgroundColor: '#13131f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardGradientBar: { height: 3 },
  cardInner: { padding: 16 },

  // Now Playing
  nowPlaying: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  albumArt: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#1e1e2e' },
  albumArtFallback: { backgroundColor: '#1e1e2e' },
  trackInfo: { flex: 1, justifyContent: 'center' },
  trackName: { color: '#f0f0f5', fontWeight: '700', fontSize: 15, marginBottom: 3 },
  artist: { color: '#8888aa', fontSize: 13, marginBottom: 8 },
  seekSlider: { width: '100%', height: 24, marginBottom: 2 },
  timesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { color: '#6b6b88', fontSize: 12 },
  shuffleBtn: { padding: 4 },
  shuffleText: { color: '#6b6b88', fontSize: 18 },
  shuffleOn: { color: ORANGE },

  // Controls
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  playPauseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,85,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,85,0,0.3)',
  },
  playPauseBtnText: { color: '#fff', fontSize: 16 },
  volumeRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  volumeIcon: { fontSize: 16 },
  volumeSlider: { flex: 1, height: 24 },
  volumeLabel: { color: '#6b6b88', fontSize: 12, width: 36, textAlign: 'right' },

  // Save row
  saveRow: { gap: 8, marginBottom: 12 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    color: '#f0f0f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  saveBtnWrap: { borderRadius: 10, overflow: 'hidden' },
  saveBtn: { paddingVertical: 11, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Timestamps list
  tsList: { marginTop: 4 },
  tsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    marginBottom: 6,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  jumpBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  playIcon: { color: ORANGE, fontSize: 12 },
  tsLabel: { color: '#d0d0e8', fontSize: 14, flex: 1 },
  tsTime: { color: '#6b6b88', fontSize: 12, marginRight: 8 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { color: '#555570', fontSize: 13 },

  // Library
  librarySection: { marginTop: 4 },
  libraryLabel: { color: '#f0f0f5', fontWeight: '700', fontSize: 16, marginBottom: 10 },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    color: '#f0f0f5',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 12,
  },
  playlistWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginBottom: 8,
    overflow: 'hidden',
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  playlistArt: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#1e1e2e' },
  playlistArtFallback: { backgroundColor: '#1e1e2e' },
  likedArt: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1e1e2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedArtText: { color: ORANGE, fontSize: 20 },
  playlistMeta: { flex: 1 },
  playlistName: { color: '#f0f0f5', fontWeight: '600', fontSize: 14 },
  playlistCount: { color: '#6b6b88', fontSize: 12, marginTop: 2 },
  chevron: { color: '#6b6b88', fontSize: 12 },

  // Track rows
  trackList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  trackLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  trackArt: { width: 40, height: 40, borderRadius: 6, backgroundColor: '#1e1e2e' },
  trackArtFallback: { width: 40, height: 40, borderRadius: 6, backgroundColor: '#1e1e2e' },
  trackMeta: { flex: 1, minWidth: 0 },
  trackRowName: { color: '#e0e0f0', fontSize: 13, fontWeight: '600' },
  trackRowArtist: { color: '#6b6b88', fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip: {
    backgroundColor: 'rgba(255,85,0,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,85,0,0.2)',
    maxWidth: 120,
  },
  chipText: { color: ORANGE, fontSize: 11 },
  trackRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  trackDuration: { color: '#6b6b88', fontSize: 12 },
  playTrackBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTrackBtnText: { color: '#fff', fontSize: 11 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#13131f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    minHeight: 420,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  modalClose: { color: '#6b6b88', fontSize: 18, padding: 4 },
  modalTitle: {
    color: '#f0f0f5',
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  modalArt: {
    width: 140,
    height: 140,
    borderRadius: 16,
    alignSelf: 'center',
    marginVertical: 16,
    backgroundColor: '#1e1e2e',
  },
  modalArtFallback: { backgroundColor: '#1e1e2e' },
  modalTrackName: {
    color: '#f0f0f5',
    fontWeight: '800',
    fontSize: 18,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  modalArtist: {
    color: '#8888aa',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  modalControls: { paddingHorizontal: 20 },
  modalSeek: { width: '100%', height: 32 },
  modalTimes: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  modalPlayPause: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,85,0,0.15)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,85,0,0.3)',
    marginBottom: 8,
  },
  modalPlayPauseText: { color: '#fff', fontSize: 20 },
  modalPlayFromStartWrap: {
    marginHorizontal: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalPlayFromStart: { paddingVertical: 12, alignItems: 'center' },
  modalPlayFromStartText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalTimestamps: { paddingHorizontal: 16, marginTop: 8 },
  modalTsHeading: {
    color: '#6b6b88',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  modalTsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalTsIcon: { color: ORANGE, fontSize: 12 },
  modalTsLabel: { color: '#d0d0e8', fontSize: 14, flex: 1 },
  modalTsTime: { color: '#6b6b88', fontSize: 13 },
});
