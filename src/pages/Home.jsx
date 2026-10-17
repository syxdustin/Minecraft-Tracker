import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import RoomLobby from "../components/RoomLobby.jsx";
import RoomView from "../components/RoomView.jsx";
import useSpotifySession from "../hooks/useSpotifySession.js";
import useSyncRoom from "../hooks/useSyncRoom.js";

const PENDING_ROOM_KEY = "pending_room_code";

// An invite link's room code has to survive the Spotify sign-in redirect.
function readInviteCode() {
  const fromUrl = new URLSearchParams(window.location.search).get("room");
  return fromUrl || sessionStorage.getItem(PENDING_ROOM_KEY) || "";
}

export default function Home() {
  const { connectSpotify, disconnectSpotify, isConnected } = useSpotifySession();
  const room = useSyncRoom();
  const [inviteCode] = useState(readInviteCode);

  useEffect(() => {
    sessionStorage.removeItem(PENDING_ROOM_KEY);
  }, []);

  function handleConnect() {
    if (inviteCode) {
      sessionStorage.setItem(PENDING_ROOM_KEY, inviteCode);
    }

    return connectSpotify();
  }

  function handleDisconnect() {
    room.leaveRoom();
    disconnectSpotify();
  }

  return (
    <main className="app-shell">
      <Header
        isConnected={isConnected}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      {!isConnected && (
        <section className="intro">
          <h2>Listen to Spotify together, in sync.</h2>
          <p>
            One person hosts a room and plays music in their own Spotify app.
            Everyone who joins with the room code hears the same track at the
            same position, and follows along when the host skips, seeks or
            pauses.
          </p>
          <p className="intro__note">
            Everyone needs Spotify Premium and Spotify open on a phone or
            computer.
          </p>
          {inviteCode && (
            <p className="intro__note">
              Connect Spotify to join room <strong>{inviteCode}</strong>.
            </p>
          )}
        </section>
      )}

      {isConnected && !room.role && (
        <RoomLobby
          initialCode={inviteCode}
          error={room.error}
          onHost={room.hostRoom}
          onJoin={room.joinRoom}
        />
      )}

      {isConnected && room.role && (
        <RoomView
          role={room.role}
          roomCode={room.roomCode}
          connectionStatus={room.connectionStatus}
          guestCount={room.guestCount}
          nowPlaying={room.nowPlaying}
          syncMessage={room.syncMessage}
          error={room.error}
          onLeave={room.leaveRoom}
        />
      )}
    </main>
  );
}
