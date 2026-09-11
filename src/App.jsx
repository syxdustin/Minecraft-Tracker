import { useState } from "react";
import Header from "./components/Header";
import Stats from "./components/Stats";

function App() {
  const [minutes, setMinutes] = useState(0);

  return (
    <div>
      <Header />

      <Stats minutes={minutes} />

      <button onClick={() => setMinutes(10)}>
        Connect Spotify
      </button>
    </div>
  );
}

export default App;