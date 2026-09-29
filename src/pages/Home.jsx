import Header from "../components/Header.jsx";
import Stats from "../components/Stats.jsx";
import ListeningDashboard from "../components/ListeningDashboard.jsx";
import CalendarHeatmap from "../components/CalendarHeatmap.jsx";
import useSpotifyListening from "../hooks/useSpotifyListening.js";

export default function Home() {
  const {
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
    refreshListening,
  } = useSpotifyListening();

  return (
    <main className="app-content">
      <Header />

      <div className="action-bar">
        {isConnected ? (
          <>
            <button
              className="button"
              type="button"
              onClick={refreshListening}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Refresh listening"}
            </button>

            <button
              className="button button--secondary"
              type="button"
              onClick={disconnectSpotify}
            >
              Disconnect Spotify
            </button>
          </>
        ) : (
          <button
            className="button"
            type="button"
            onClick={connectSpotify}
          >
            Connect Spotify
          </button>
        )}
      </div>

      <Stats minutes={minutes} label="Recent Minecraft listening time" />

      <ListeningDashboard
        tracks={minecraftTracks}
        excludedTracks={excludedTracks}
        albumTotals={albumTotals}
        isConnected={isConnected}
        isLoading={isLoading}
        error={error}
      />

      {isConnected && (
        <CalendarHeatmap
          sessions={heatmapSessions}
          isSignedIn={isConnected}
          isLoading={isLoading}
        />
      )}
    </main>
  );
}