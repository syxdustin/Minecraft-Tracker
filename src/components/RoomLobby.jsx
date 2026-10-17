import { useState } from "react";
import { ROOM_CODE_LENGTH } from "../utils/roomCode.js";

function RoomLobby({ initialCode, error, onHost, onJoin }) {
  const [code, setCode] = useState(initialCode || "");

  function handleSubmit(event) {
    event.preventDefault();
    onJoin(code);
  }

  return (
    <section className="lobby">
      <div className="panel">
        <h2>Host a room</h2>
        <p>
          Share what you're playing on Spotify. Anyone who joins follows your
          track, position and pause.
        </p>
        <button className="button" type="button" onClick={onHost}>
          Create room
        </button>
      </div>

      <form className="panel" onSubmit={handleSubmit}>
        <h2>Join a room</h2>
        <p>Enter the code from the host to listen along.</p>
        <div className="join-form">
          <input
            className="code-input"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={ROOM_CODE_LENGTH}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck="false"
            aria-label="Room code"
          />
          <button className="button" type="submit">
            Join
          </button>
        </div>
      </form>

      {error && <p className="status-error">{error}</p>}
    </section>
  );
}

export default RoomLobby;
