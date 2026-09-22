import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Stats from "./components/Stats.jsx";
import Callback from "./components/Callback.jsx";
import CognitoCallback from "./components/CognitoCallback.jsx";
import ListeningDashboard from "./components/ListeningDashboard.jsx";
import SessionHistory from "./components/SessionHistory.jsx";
import CalendarHeatmap from "./components/CalendarHeatmap.jsx";
import {
  clearSpotifySession,
  getRecentlyPlayed,
  hasSpotifySession,
  loginWithSpotify,
} from "./Spotify.jsx";
import {
  isCognitoAuthenticated,
  isCognitoConfigured,
  loginWithCognito,
  logoutFromCognito,
} from "./auth/cognito.js";
import {
  isSessionApiConfigured,
  loadSessions,
  saveSessions,
} from "./api/sessions.js";

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

const DATE_RANGE_LABELS = {
  all: "all time",
  today: "today",
  week: "last 7 days",
  month: "last 30 days",
};

function getSessionsForRange(sessions, dateRange) {
  if (dateRange === "all") {
    return sessions;
  }

  const cutoff = new Date();

  if (dateRange === "today") {
    cutoff.setHours(0, 0, 0, 0);
  } else if (dateRange === "week") {
    cutoff.setDate(cutoff.getDate() - 6);
    cutoff.setHours(0, 0, 0, 0);
  } else {
    cutoff.setDate(cutoff.getDate() - 29);
    cutoff.setHours(0, 0, 0, 0);
  }

  return sessions.filter((session) => new Date(session.playedAt) >= cutoff);
}

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

function createSessionRecord(item) {
  const track = item.track;

  return {
    playedAt: item.played_at,
    trackId: track.id,
    trackName: track.name,
    artists: track.artists.map((artist) => artist.name).join(", "),
    albumId: track.album?.id,
    albumName: track.album?.name,
    imageUrl: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url,
    durationMs: track.duration_ms,
  };
}

function Home() {
  const cloudConfigured = isCognitoConfigured() && isSessionApiConfigured();
  const [minutes, setMinutes] = useState(0);
  const [minecraftTracks, setMinecraftTracks] = useState([]);
  const [excludedTracks, setExcludedTracks] = useState([]);
  const [isConnected, setIsConnected] = useState(hasSpotifySession);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [historySessions, setHistorySessions] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  const [dateRange, setDateRange] = useState("all");
  const [isCloudSignedIn, setIsCloudSignedIn] = useState(
    () => cloudConfigured && isCognitoAuthenticated()
  );

  useEffect(() => {
    if (!cloudConfigured || !isCloudSignedIn) {
      setHistorySessions([]);
      setHistoryError("");
      setHasLoadedHistory(false);
      setIsHistoryLoading(false);
      return;
    }

    let isCurrent = true;

    async function loadSessionHistory() {
      setIsHistoryLoading(true);
      setHistoryError("");

      try {
        const sessions = await loadSessions();

        if (!isCurrent) {
          return;
        }

        setHistorySessions(sessions);
        setHasLoadedHistory(true);
      } catch (requestError) {
        if (isCurrent) {
          setHistoryError(requestError.message);
        }
      } finally {
        if (isCurrent) {
          setIsHistoryLoading(false);
        }
      }
    }

    loadSessionHistory();

    return () => {
      isCurrent = false;
    };
  }, [cloudConfigured, historyReloadKey, isCloudSignedIn]);

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

        if (cloudConfigured && isCloudSignedIn) {
          try {
            const sessions = countedTracks
              .filter((item) => item.track?.id && item.played_at)
              .map(createSessionRecord);

            await saveSessions(sessions);

            if (isCurrent) {
              setHistoryReloadKey((key) => key + 1);
            }
          } catch (syncError) {
            if (isCurrent) {
              setHistoryError(
                `Your recent tracks loaded, but cloud history could not save: ${syncError.message}`
              );
            }
          }
        }
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
  }, [cloudConfigured, isCloudSignedIn, isConnected, reloadKey]);

  const albumTotals = useMemo(
    () => getAlbumTotals(minecraftTracks),
    [minecraftTracks]
  );
  const filteredHistorySessions = useMemo(
    () => getSessionsForRange(historySessions, dateRange),
    [dateRange, historySessions]
  );
  const historyMinutes = useMemo(
    () =>
      Math.round(
        filteredHistorySessions.reduce(
          (total, session) => total + session.durationMs,
          0
        ) / 60000
      ),
    [filteredHistorySessions]
  );
  const showSavedTotal =
    cloudConfigured && isCloudSignedIn && hasLoadedHistory;

  function handleDisconnect() {
    clearSpotifySession();
    setIsConnected(false);
    setMinecraftTracks([]);
    setExcludedTracks([]);
    setMinutes(0);
    setError("");
  }

  async function handleCloudSignIn() {
    setHistoryError("");

    try {
      await loginWithCognito();
    } catch (loginError) {
      setHistoryError(loginError.message);
    }
  }

  function handleCloudSignOut() {
    setIsCloudSignedIn(false);
    setHistorySessions([]);
    setHasLoadedHistory(false);
    logoutFromCognito();
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

      <Stats
        minutes={showSavedTotal ? historyMinutes : minutes}
        label={
          showSavedTotal
            ? `Saved Minecraft listening time (${DATE_RANGE_LABELS[dateRange]})`
            : "Recent Minecraft listening time"
        }
      />

      <ListeningDashboard
        tracks={minecraftTracks}
        excludedTracks={excludedTracks}
        albumTotals={albumTotals}
        isConnected={isConnected}
        isLoading={isLoading}
        error={error}
      />

      <SessionHistory
        sessions={filteredHistorySessions}
        isConfigured={cloudConfigured}
        isSignedIn={isCloudSignedIn}
        isLoading={isHistoryLoading}
        error={historyError}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onSignIn={handleCloudSignIn}
        onSignOut={handleCloudSignOut}
        onRefresh={() => setHistoryReloadKey((key) => key + 1)}
      />

      {cloudConfigured ? (
        <CalendarHeatmap
          sessions={historySessions}
          isSignedIn={isCloudSignedIn}
          isLoading={isHistoryLoading}
        />
      ) : null}
    </main>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/auth/callback" element={<CognitoCallback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
