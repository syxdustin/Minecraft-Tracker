import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Stats from "./components/Stats.jsx";
import Callback from "./components/Callback.jsx";
import { getRecentlyPlayed, loginWithSpotify } from "./Spotify.jsx";

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
  const isMinecraftAlbum = MINECRAFT_SOUNDTRACK_ALBUMS.has(
    track.album.name.toLowerCase()
  );

  const hasMinecraftComposer = track.artists.some((artist) =>
    MINECRAFT_COMPOSERS.has(artist.name)
  );

  return isMinecraftAlbum && hasMinecraftComposer;
}

function Home() {
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    async function loadSpotifyData() {
      try {
        const data = await getRecentlyPlayed();

        const minecraftTracks = data.items.filter((item) =>
          isMinecraftSoundtrackTrack(item.track)
        );

        const totalMilliseconds = minecraftTracks.reduce((total, item) => {
          return total + item.track.duration_ms;
        }, 0);

        setMinutes(Math.round(totalMilliseconds / 60000));
      } catch (error) {
        console.error(error.message);
      }
    }

    loadSpotifyData();
  }, []);

  return (
    <div>
      <Header />
      <Stats minutes={minutes} />

      <button onClick={loginWithSpotify}>
        Connect Spotify
      </button>
    </div>
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
