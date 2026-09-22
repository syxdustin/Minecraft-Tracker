import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Stats from "./components/Stats.jsx";
import Callback from "./components/Callback.jsx";
import { getRecentlyPlayed, loginWithSpotify } from "./Spotify.jsx";

function Home() {
  const [minutes, setMinutes] = useState(0);
  
  useEffect(() => {
  async function loadSpotifyData() {
    try {
      const data = await getRecentlyPlayed();
      console.log(data.items);
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