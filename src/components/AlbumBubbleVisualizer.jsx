function formatListeningTime(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getBubbleSize(durationMs, maximumDurationMs) {
  const smallestBubble = 88;
  const largestBubble = 244;

  if (!maximumDurationMs) {
    return smallestBubble;
  }

  const relativeArea = durationMs / maximumDurationMs;

  return Math.round(
    smallestBubble + (largestBubble - smallestBubble) * Math.sqrt(relativeArea)
  );
}

function getAlbumInitials(name) {
  return name
    .replace(/^minecraft[:\s-]*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function AlbumBubble({ album, index, maximumDurationMs }) {
  const size = getBubbleSize(album.durationMs, maximumDurationMs);
  const offset = [8, -12, 14, -5, 10, -10, 4][index % 7];

  return (
    <article
      className="album-bubble"
      style={{
        "--bubble-size": `${size}px`,
        "--bubble-offset": `${offset}px`,
      }}
    >
      {album.imageUrl ? (
        <img src={album.imageUrl} alt="" />
      ) : (
        <span className="album-bubble__fallback" aria-hidden="true">
          {getAlbumInitials(album.name)}
        </span>
      )}

      <div className="album-bubble__details">
        <span>{formatListeningTime(Math.round(album.durationMs / 60000))}</span>
        <strong>{album.name}</strong>
      </div>
    </article>
  );
}

function AlbumBubbleVisualizer({
  albumTotals,
  minutes,
  tracksCount,
  isLoading,
  error,
}) {
  const maximumDurationMs = albumTotals[0]?.durationMs || 0;

  return (
    <section className="album-bubbles" aria-labelledby="soundtrack-heading">
      <header className="album-bubbles__header">
        <div>
          <h2 id="soundtrack-heading">Minecraft soundtrack</h2>
          <p>
            {albumTotals.length
              ? `${formatListeningTime(minutes)} across ${tracksCount} play${tracksCount === 1 ? "" : "s"}`
              : "No official Minecraft tracks in this Spotify window."}
          </p>
        </div>
        <p className="album-bubbles__legend">Bubble area = listening time</p>
      </header>

      {error ? <p className="album-bubbles__error">{error}</p> : null}

      {isLoading && !albumTotals.length ? (
        <p className="album-bubbles__status">Loading your Spotify snapshot…</p>
      ) : albumTotals.length ? (
        <div
          className="bubble-field"
          aria-label="Minecraft soundtrack albums sized by listening time"
        >
          {albumTotals.map((album, index) => (
            <AlbumBubble
              key={album.id}
              album={album}
              index={index}
              maximumDurationMs={maximumDurationMs}
            />
          ))}
        </div>
      ) : (
        <p className="album-bubbles__status">
          Play a Minecraft soundtrack track, then refresh.
        </p>
      )}
    </section>
  );
}

export default AlbumBubbleVisualizer;
