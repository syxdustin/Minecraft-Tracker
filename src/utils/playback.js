// Service-neutral description of a track, shared between room members.
// The ISRC lets a member on another streaming service find the same recording.
function toSharedTrack(item) {
  if (!item) return null;

  const images = item.album?.images || item.images || [];

  return {
    spotifyUri: item.uri,
    isrc: item.external_ids?.isrc || null,
    name: item.name,
    artists:
      item.artists?.map((artist) => artist.name).join(", ") ||
      item.show?.name ||
      "",
    artworkUrl: images[0]?.url || null,
    durationMs: item.duration_ms || 0,
  };
}

function describeSpotifyError(error) {
  if (error.reason === "PREMIUM_REQUIRED") {
    return "Spotify Premium is required to control playback.";
  }

  if (error.reason === "NO_ACTIVE_DEVICE") {
    return "No Spotify device found. Open Spotify on your phone or computer.";
  }

  if (error.status === 429) {
    return "Spotify is rate limiting requests. Retrying shortly…";
  }

  return error.message || "Spotify request failed.";
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export { describeSpotifyError, formatTime, toSharedTrack };
