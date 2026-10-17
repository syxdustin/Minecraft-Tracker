import { useState } from "react";
import NowPlaying from "./NowPlaying.jsx";

function describeConnection({ role, connectionStatus, guestCount }) {
  if (connectionStatus === "connecting") {
    return role === "host" ? "Opening room…" : "Connecting to host…";
  }

  if (connectionStatus === "closed") return "Disconnected";

  if (role === "host") {
    if (guestCount === 0) return "Waiting for someone to join";
    return guestCount === 1 ? "1 listener connected" : `${guestCount} listeners connected`;
  }

  return "Connected to host";
}

function RoomView({
  role,
  roomCode,
  connectionStatus,
  guestCount,
  nowPlaying,
  syncMessage,
  error,
  onLeave,
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ room: roomCode }).toString();

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="room">
      <div className="room__header">
        <div>
          <span className="room__label">
            {role === "host" ? "You're hosting" : "You're listening along"}
          </span>
          <div className="room__code">{roomCode || "······"}</div>
          <span className="room__status">
            {describeConnection({ role, connectionStatus, guestCount })}
          </span>
        </div>

        <div className="room__actions">
          {role === "host" && roomCode && (
            <button className="button button--quiet" type="button" onClick={copyLink}>
              {copied ? "Link copied" : "Copy invite link"}
            </button>
          )}
          <button className="button" type="button" onClick={onLeave}>
            Leave room
          </button>
        </div>
      </div>

      <NowPlaying state={nowPlaying} />

      {syncMessage && <p className="room__sync">{syncMessage}</p>}
      {error && <p className="status-error">{error}</p>}
    </section>
  );
}

export default RoomView;
