import { useState } from "react";

function App() {
  const [minutes, setMinutes] = useState(0);

  return (
    <div>
      <h1>Minecraft Music Tracker</h1>

      <p>Minecraft listening time: {minutes} minutes</p>

      <button onClick={() => setMinutes(10)}>
        Connect Spotify
      </button>
    </div>
  );
}

export default App;