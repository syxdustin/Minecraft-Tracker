import { useCallback, useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import {
  findTrackUriByIsrc,
  getPlaybackState,
  pausePlayback,
  playTrack,
  seekPlayback,
} from "../Spotify.jsx";
import { describeSpotifyError, toSharedTrack } from "../utils/playback.js";
import {
  isValidRoomCode,
  makeRoomCode,
  normalizeRoomCode,
  peerIdForRoom,
} from "../utils/roomCode.js";

const HOST_POLL_MS = 1000;
const GUEST_SYNC_MS = 1000;
const PING_INTERVAL_MS = 5000;
const JOIN_TIMEOUT_MS = 15000;
// How far the guest may drift from the host before seeking.
const DRIFT_TOLERANCE_MS = 1500;
// Spotify's reported state lags behind commands, so wait before re-checking.
const ACTION_COOLDOWN_MS = 2500;
const RATE_LIMIT_BACKOFF_MS = 5000;
// Don't chase the host in the last moments of a track; it is about to change.
const TRACK_END_MARGIN_MS = 2000;
const MAX_HOST_ATTEMPTS = 3;

// Uses the free public PeerJS broker unless a self-hosted PeerServer is set.
const PEER_OPTIONS = import.meta.env.VITE_PEER_HOST
  ? {
      host: import.meta.env.VITE_PEER_HOST,
      port: Number(import.meta.env.VITE_PEER_PORT) || 443,
      path: import.meta.env.VITE_PEER_PATH || "/",
      secure: import.meta.env.VITE_PEER_SECURE !== "false",
    }
  : {};

// Runs an async task repeatedly without overlapping calls.
function startLoop(task, intervalMs) {
  let stopped = false;
  let timeoutId;

  async function tick() {
    await task();

    if (!stopped) {
      timeoutId = setTimeout(tick, intervalMs);
    }
  }

  tick();

  return () => {
    stopped = true;
    clearTimeout(timeoutId);
  };
}

function snapshotFromPlayback(state, requestedAt, receivedAt) {
  const track = toSharedTrack(state?.item);
  const isPlaying = Boolean(state?.is_playing && track);
  // Spotify measured progress roughly halfway through the request.
  const positionMs = state
    ? state.progress_ms + (isPlaying ? (receivedAt - requestedAt) / 2 : 0)
    : 0;

  return { track, isPlaying, positionMs };
}

function estimatePosition(state, now) {
  if (!state.isPlaying) return state.positionMs;

  return state.positionMs + (now - state.capturedAt);
}

export default function useSyncRoom() {
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("idle");
  const [guestCount, setGuestCount] = useState(0);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [syncMessage, setSyncMessage] = useState("");
  const [error, setError] = useState("");

  const peerRef = useRef(null);
  const connectionsRef = useRef(new Set());
  const stopFnsRef = useRef([]);
  const latestSnapshotRef = useRef(null);
  const hostStateRef = useRef(null);
  const latencyRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const uriCacheRef = useRef(new Map());

  const teardown = useCallback(() => {
    stopFnsRef.current.forEach((stop) => stop());
    stopFnsRef.current = [];
    connectionsRef.current.clear();
    peerRef.current?.destroy();
    peerRef.current = null;
    latestSnapshotRef.current = null;
    hostStateRef.current = null;
    latencyRef.current = 0;
    cooldownUntilRef.current = 0;
  }, []);

  const leaveRoom = useCallback(() => {
    teardown();
    setRole(null);
    setRoomCode("");
    setConnectionStatus("idle");
    setGuestCount(0);
    setNowPlaying(null);
    setSyncMessage("");
    setError("");
  }, [teardown]);

  useEffect(() => teardown, [teardown]);

  const pollHostPlayback = useCallback(async () => {
    try {
      const requestedAt = Date.now();
      const state = await getPlaybackState();
      const receivedAt = Date.now();
      const snapshot = snapshotFromPlayback(state, requestedAt, receivedAt);

      latestSnapshotRef.current = { ...snapshot, sentAt: receivedAt };
      setNowPlaying({ ...snapshot, capturedAt: receivedAt });
      setSyncMessage(
        snapshot.track ? "" : "Start playing something in Spotify to share it."
      );

      connectionsRef.current.forEach((connection) => {
        connection.send({ type: "state", ...latestSnapshotRef.current });
      });
    } catch (requestError) {
      setSyncMessage(describeSpotifyError(requestError));
    }
  }, []);

  const resolveSpotifyUri = useCallback(async (track) => {
    if (track.spotifyUri?.startsWith("spotify:")) return track.spotifyUri;
    if (!track.isrc) return null;

    const cache = uriCacheRef.current;

    if (!cache.has(track.isrc)) {
      cache.set(track.isrc, await findTrackUriByIsrc(track.isrc));
    }

    return cache.get(track.isrc);
  }, []);

  const syncGuestPlayback = useCallback(async () => {
    const host = hostStateRef.current;

    if (!host || Date.now() < cooldownUntilRef.current) return;

    function startCooldown(ms = ACTION_COOLDOWN_MS) {
      cooldownUntilRef.current = Date.now() + ms;
    }

    try {
      if (!host.track) {
        setSyncMessage("The host isn't playing anything right now.");
        return;
      }

      const uri = await resolveSpotifyUri(host.track);

      if (!uri) {
        setSyncMessage("This track isn't available on Spotify.");
        return;
      }

      const requestedAt = Date.now();
      const own = await getPlaybackState();
      const now = Date.now();
      const deviceId = own?.device?.id;
      const target = estimatePosition(host, now);

      if (!host.isPlaying) {
        if (own?.is_playing) {
          await pausePlayback(deviceId);
          startCooldown();
        }

        setSyncMessage("Paused with the host.");
        return;
      }

      if (target >= host.track.durationMs - TRACK_END_MARGIN_MS) return;

      const ownUris = [own?.item?.uri, own?.item?.linked_from?.uri];

      if (!ownUris.includes(uri) || !own?.is_playing) {
        await playTrack(uri, target, deviceId);
        startCooldown();
        setSyncMessage("Catching up with the host…");
        return;
      }

      const ownPosition = own.progress_ms + (now - requestedAt) / 2;
      const drift = ownPosition - target;

      if (Math.abs(drift) > DRIFT_TOLERANCE_MS) {
        await seekPlayback(target, deviceId);
        startCooldown();
        setSyncMessage("Adjusting to match the host…");
        return;
      }

      setSyncMessage(`In sync (within ${(Math.abs(drift) / 1000).toFixed(1)}s)`);
    } catch (requestError) {
      startCooldown(
        requestError.status === 429 ? RATE_LIMIT_BACKOFF_MS : ACTION_COOLDOWN_MS
      );
      setSyncMessage(describeSpotifyError(requestError));
    }
  }, [resolveSpotifyUri]);

  const hostRoom = useCallback(() => {
    teardown();
    setError("");
    setRole("host");
    setConnectionStatus("connecting");

    function openPeer(attempt) {
      const code = makeRoomCode();
      const peer = new Peer(peerIdForRoom(code), PEER_OPTIONS);
      peerRef.current = peer;

      peer.on("open", () => {
        setRoomCode(code);
        setConnectionStatus("open");
        stopFnsRef.current.push(startLoop(pollHostPlayback, HOST_POLL_MS));
      });

      peer.on("connection", (connection) => {
        connection.on("open", () => {
          connectionsRef.current.add(connection);
          setGuestCount(connectionsRef.current.size);

          if (latestSnapshotRef.current) {
            connection.send({ type: "state", ...latestSnapshotRef.current });
          }
        });

        connection.on("data", (message) => {
          if (message?.type === "ping") {
            connection.send({ type: "pong", sentAt: message.sentAt });
          }
        });

        connection.on("close", () => {
          connectionsRef.current.delete(connection);
          setGuestCount(connectionsRef.current.size);
        });
      });

      peer.on("error", (peerError) => {
        if (peerError.type === "unavailable-id" && attempt < MAX_HOST_ATTEMPTS) {
          peer.destroy();
          openPeer(attempt + 1);
          return;
        }

        setConnectionStatus("closed");
        setError(`Room connection failed: ${peerError.message}`);
      });
    }

    openPeer(1);
  }, [pollHostPlayback, teardown]);

  const joinRoom = useCallback(
    (input) => {
      const code = normalizeRoomCode(input);

      if (!isValidRoomCode(code)) {
        setError("Room codes are 6 letters and numbers.");
        return;
      }

      teardown();
      setError("");
      setRole("guest");
      setRoomCode(code);
      setConnectionStatus("connecting");

      const peer = new Peer(PEER_OPTIONS);
      peerRef.current = peer;

      const joinTimeout = setTimeout(() => {
        setConnectionStatus("closed");
        setError(`Couldn't reach room ${code}. Check the code and try again.`);
      }, JOIN_TIMEOUT_MS);
      stopFnsRef.current.push(() => clearTimeout(joinTimeout));

      peer.on("open", () => {
        const connection = peer.connect(peerIdForRoom(code), { reliable: true });

        connection.on("open", () => {
          clearTimeout(joinTimeout);
          setConnectionStatus("open");
          setSyncMessage("Waiting for the host's playback…");

          stopFnsRef.current.push(
            startLoop(async () => {
              connection.send({ type: "ping", sentAt: Date.now() });
            }, PING_INTERVAL_MS),
            startLoop(syncGuestPlayback, GUEST_SYNC_MS)
          );
        });

        connection.on("data", (message) => {
          if (message?.type === "pong") {
            const oneWay = (Date.now() - message.sentAt) / 2;
            latencyRef.current = latencyRef.current
              ? latencyRef.current * 0.7 + oneWay * 0.3
              : oneWay;
            return;
          }

          if (message?.type === "state") {
            // Positions are measured on the host's clock; only the transit
            // delay matters here, so clocks don't need to agree.
            const state = {
              track: message.track,
              isPlaying: message.isPlaying,
              positionMs: message.positionMs + latencyRef.current,
              capturedAt: Date.now(),
            };

            hostStateRef.current = state;
            setNowPlaying(state);
          }
        });

        connection.on("close", () => {
          setConnectionStatus("closed");
          setSyncMessage("");
          setError("The host closed the room.");
          stopFnsRef.current.forEach((stop) => stop());
          stopFnsRef.current = [];
        });
      });

      peer.on("error", (peerError) => {
        clearTimeout(joinTimeout);
        setConnectionStatus("closed");
        setError(
          peerError.type === "peer-unavailable"
            ? `No room found with code ${code}.`
            : `Room connection failed: ${peerError.message}`
        );
      });
    },
    [syncGuestPlayback, teardown]
  );

  return {
    connectionStatus,
    error,
    guestCount,
    hostRoom,
    joinRoom,
    leaveRoom,
    nowPlaying,
    role,
    roomCode,
    syncMessage,
  };
}
