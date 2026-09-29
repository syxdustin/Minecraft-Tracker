import Header from "../components/Header.jsx";
import AlbumBubbleVisualizer from "../components/AlbumBubbleVisualizer.jsx";
import useSpotifyListening from "../hooks/useSpotifyListening.js";

export default function Home() {
  const {
    minutes,
    minecraftTracks,
    albumTotals,
    isConnected,
    isLoading,
    error,
    connectSpotify,
    disconnectSpotify,
    refreshListening,
  } = useSpotifyListening();

  return (
    <main className="app-shell">
      <Header
        isConnected={isConnected}
        isLoading={isLoading}
        onConnect={connectSpotify}
        onDisconnect={disconnectSpotify}
        onRefresh={refreshListening}
      />

      <AlbumBubbleVisualizer
        albumTotals={albumTotals}
        minutes={minutes}
        tracksCount={minecraftTracks.length}
        isLoading={isLoading}
        error={error}
      />
    </main>
  );
}
