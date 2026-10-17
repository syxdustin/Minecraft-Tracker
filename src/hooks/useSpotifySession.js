import { useState } from "react";
import {
  clearSpotifySession,
  hasSpotifySession,
  loginWithSpotify,
} from "../Spotify.jsx";

export default function useSpotifySession() {
  const [isConnected, setIsConnected] = useState(hasSpotifySession);

  function connectSpotify() {
    return loginWithSpotify();
  }

  function disconnectSpotify() {
    clearSpotifySession();
    setIsConnected(false);
  }

  return { connectSpotify, disconnectSpotify, isConnected };
}
