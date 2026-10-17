import { useEffect, useState } from "react";
import { formatTime } from "../utils/playback.js";

function NowPlaying({ state }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(intervalId);
  }, []);

  if (!state?.track) {
    return (
      <div className="now-playing now-playing--empty">
        <p>Nothing playing yet.</p>
      </div>
    );
  }

  const { track } = state;
  const elapsed = state.isPlaying
    ? state.positionMs + Math.max(0, now - state.capturedAt)
    : state.positionMs;
  const position = Math.min(elapsed, track.durationMs);
  const progress = track.durationMs ? (position / track.durationMs) * 100 : 0;

  return (
    <div className="now-playing">
      {track.artworkUrl ? (
        <img className="now-playing__art" src={track.artworkUrl} alt="" />
      ) : (
        <div className="now-playing__art now-playing__art--fallback" />
      )}

      <div className="now-playing__details">
        <span className="now-playing__label">
          {state.isPlaying ? "Now playing" : "Paused"}
        </span>
        <strong>{track.name}</strong>
        <span>{track.artists}</span>

        <div className="progress" aria-hidden="true">
          <div className="progress__fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress__times">
          <span>{formatTime(position)}</span>
          <span>{formatTime(track.durationMs)}</span>
        </div>
      </div>
    </div>
  );
}

export default NowPlaying;
