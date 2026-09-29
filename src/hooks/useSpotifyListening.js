import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearSpotifySession,
  getRecentlyPlayed,
  hasSpotifySession,
  loginWithSpotify,
} from "../Spotify.jsx";
import {
  createHeatmapEntry,
  getAlbumTotals,
  isMinecraftSoundtrackTrack,
} from "../utils/minecraftMusic.js";

export default function useSpotifyListening() {
  const [minutes, setMinutes] = useState(0);
  const [minecraftTracks, setMinecraftTracks] = useState([]);
  const [excludedTracks, setExcludedTracks] = useState([]);
  const [isConnected, setIsConnected] = useState(hasSpotifySession);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSpotifyData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await getRecentlyPlayed();

      const minecraft = data.items.filter((item) =>
        isMinecraftSoundtrackTrack(item.track)
      );
      const excluded = data.items.filter(
        (item) => !isMinecraftSoundtrackTrack(item.track)
      );

      const totalMilliseconds = minecraft.reduce(
        (total, item) => total + item.track.duration_ms,
        0
      );

      setMinecraftTracks(minecraft);
      setExcludedTracks(excluded);
      setMinutes(Math.round(totalMilliseconds / 60000));
    } catch (requestError) {
      setError(requestError.message);

      if (!hasSpotifySession()) {
        setIsConnected(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadSpotifyData();
    }
  }, [isConnected, loadSpotifyData]);

  function connectSpotify() {
    loginWithSpotify();
  }

  function disconnectSpotify() {
    clearSpotifySession();
    setIsConnected(false);
    setMinecraftTracks([]);
    setExcludedTracks([]);
    setMinutes(0);
    setError("");
  }

  const albumTotals = useMemo(
    () => getAlbumTotals(minecraftTracks),
    [minecraftTracks]
  );

  const heatmapSessions = useMemo(
    () => minecraftTracks.map(createHeatmapEntry),
    [minecraftTracks]
  );

  return {
    minutes,
    minecraftTracks,
    excludedTracks,
    albumTotals,
    heatmapSessions,
    isConnected,
    isLoading,
    error,
    connectSpotify,
    disconnectSpotify,
    refreshListening: loadSpotifyData,
  };
}