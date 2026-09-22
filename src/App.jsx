import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Stats from "./components/Stats.jsx";
import Callback from "./components/Callback.jsx";
import ListeningDashboard from "./components/ListeningDashboard.jsx";
import {
  clearSpotifySession,
  getRecentlyPlayed,
  hasSpotifySession,
  loginWithSpotify,
} from "./Spotify.jsx";

const MINECRAFT_SOUNDTRACK_ALBUMS = new Set([
  "minecraft - volume alpha",
  "minecraft - volume beta",
  "minecraft: nether update: original game soundtrack",
  "minecraft: caves & cliffs (original game soundtrack)",
  "minecraft: the wild update (original game soundtrack)",
  "minecraft: trails & tales: original game soundtrack",
  "minecraft: tricky trials (original game soundtrack)",
]);

const MINECRAFT_COMPOSERS = new Set([
  "C418",
  "Lena Raine",
  "Kumi Tanioka",
  "Samuel Åberg",
  "Aaron Cherof",
]);

function isMinecraftSoundtrackTrack(track) {
  const albumName = track.album?.name?.toLowerCase();

  const isMinecraftAlbum = MINECRAFT_SOUNDTRACK_ALBUMS.has(albumName);
  const hasMinecraftComposer = track.artists.some((artist) =>
    MINECRAFT_COMPOSERS.has(artist.name)
  );

  return isMinecraftAlbum && hasMinecraftComposer;
}

function getAlbumTotals(items) {
  const totals = items.reduce((albums, item) => {
    const album = item.track.album;
    const existing = albums.get(album.id) || {
      id: album.id,
      name: album.name,
      imageUrl: album.images?.[1]?.url || album.images?.[0]?.url,
      durationMs: 0,
      trackCount: 0,
    };

    existing.durationMs += item.track.duration_ms;
    existing.trackCount += 1;
    albums.set(album.id, existing);

    return albums;
  }, new Map());

  return [...totals.values()].sort((a, b) => b.durationMs - a.durationMs);
}

function Home() {
  const [minutes, setMinutes] = useState(0);
  const [minecraftTracks, setMinecraftTracks] = useState([]);
  const [excludedTracks, setExcludedTracks] = useState([]);
  const [isConnected, setIsConnected] = useState(hasSpotifySession);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    let isCurrent = true;

    async function loadSpotifyData() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getRecentlyPlayed();
        const countedTracks = data.items.filter((item) =>
          isMinecraftSoundtrackTrack(item.track)
        );
        const notMinecraftTracks = data.items.filter(
          (item) => !isMinecraftSoundtrackTrack(item.track)
        );

        const totalMilliseconds = countedTracks.reduce((total, item) => {
          return total + item.track.duration_ms;
        }, 0);

        if (!isCurrent) {
          return;
        }

        setMinecraftTracks(countedTracks);
        setExcludedTracks(notMinecraftTracks);
        setMinutes(Math.round(totalMilliseconds / 60000));
      } catch (requestError) {
        if (!isCurrent) {
          return;
        }

        setError(requestError.message);

        if (!hasSpotifySession()) {
          setIsConnected(false);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadSpotifyData();

    return () => {
      isCurrent = false;
    };
  }, [isConnected, reloadKey]);

  const albumTotals = useMemo(
    () => getAlbumTotals(minecraftTracks),
    [minecraftTracks]
  );

  function handleDisconnect() {
    clearSpotifySession();
    setIsConnected(false);
    setMinecraftTracks([]);
    setExcludedTracks([]);
    setMinutes(0);
    setError("");
  }

  return (
    <main className="app-content">
      <Header />

      <div className="action-bar">
        {isConnected ? (
          <>
            <button
              className="button"
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Refresh listening"}
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={handleDisconnect}
            >
              Disconnect Spotify
            </button>
          </>
        ) : (
          <button className="button" type="button" onClick={loginWithSpotify}>
            Connect Spotify
          </button>
        )}
      </div>

      <Stats minutes={minutes} />

      <ListeningDashboard
        tracks={minecraftTracks}
        excludedTracks={excludedTracks}
        albumTotals={albumTotals}
        isConnected={isConnected}
        isLoading={isLoading}
        error={error}
      />
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/callback" element={<Callback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
