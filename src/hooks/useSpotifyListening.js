import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearSpotifySession,
  getRecentlyPlayed,
  hasSpotifySession,
  loginWithSpotify,
} from "../Spotify.jsx";
import {
  getAlbumTotals,
  isMinecraftSoundtrackTrack,
} from "../utils/MinecraftMusic.js";

export default function useSpotifyListening() {
  const [minecraftTracks, setMinecraftTracks] = useState([]);
  const [isConnected, setIsConnected] = useState(hasSpotifySession);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSpotifyData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await getRecentlyPlayed();
      const items = data.items || [];

      setMinecraftTracks(
        items.filter((item) => isMinecraftSoundtrackTrack(item.track))
      );
    } catch (requestError) {
      setError(requestError.message || "Could not load your Spotify history.");

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

  const minutes = useMemo(
    () =>
      Math.round(
        minecraftTracks.reduce(
          (total, item) => total + (item.track.duration_ms || 0),
          0
        ) / 60000
      ),
    [minecraftTracks]
  );

  const albumTotals = useMemo(
    () => getAlbumTotals(minecraftTracks),
    [minecraftTracks]
  );

  function connectSpotify() {
    return loginWithSpotify();
  }

  function disconnectSpotify() {
    clearSpotifySession();
    setIsConnected(false);
    setMinecraftTracks([]);
    setError("");
  }

  return {
    albumTotals,
    connectSpotify,
    disconnectSpotify,
    error,
    isConnected,
    isLoading,
    minutes,
    minecraftTracks,
    refreshListening: loadSpotifyData,
  };
}
