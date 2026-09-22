function formatDuration(durationMs) {
  const totalMinutes = Math.round(durationMs / 60000);

  return `${totalMinutes} min`;
}

function formatPlayedAt(playedAt) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(playedAt));
}

function TrackRow({ item }) {
  const track = item.track;
  const imageUrl = track.album.images?.[2]?.url || track.album.images?.[0]?.url;
  const artists = track.artists.map((artist) => artist.name).join(", ");

  return (
    <li className="track-row">
      {imageUrl ? (
        <img className="track-row__art" src={imageUrl} alt="" />
      ) : (
        <div className="track-row__art track-row__art--empty" aria-hidden="true" />
      )}

      <div className="track-row__details">
        <strong>{track.name}</strong>
        <span>{artists}</span>
        <span className="track-row__album">{track.album.name}</span>
      </div>

      <div className="track-row__meta">
        <span>{formatDuration(track.duration_ms)}</span>
        <time dateTime={item.played_at}>{formatPlayedAt(item.played_at)}</time>
      </div>
    </li>
  );
}

function ListeningDashboard({
  tracks,
  excludedTracks,
  albumTotals,
  isConnected,
  isLoading,
  error,
}) {
  if (!isConnected) {
    return (
      <section className="dashboard dashboard--empty">
        <h2>Connect Spotify to start tracking</h2>
        <p>
          The tracker will separate official Minecraft soundtrack music from the
          rest of your recently played tracks.
        </p>
      </section>
    );
  }

  return (
    <section className="dashboard">
      <div className="dashboard__heading">
        <div>
          <h2>Recent Minecraft listening</h2>
          <p>
            {isLoading
              ? "Loading your Spotify history..."
              : `${tracks.length} official Minecraft tracks counted from your recent history.`}
          </p>
        </div>
      </div>

      {error ? <p className="dashboard__error">{error}</p> : null}

      <div className="dashboard__grid">
        <section className="dashboard-card">
          <h3>By soundtrack album</h3>
          {albumTotals.length ? (
            <ul className="album-totals">
              {albumTotals.map((album) => (
                <li key={album.id} className="album-total">
                  {album.imageUrl ? (
                    <img src={album.imageUrl} alt="" />
                  ) : null}
                  <div>
                    <strong>{album.name}</strong>
                    <span>
                      {album.trackCount} tracks · {formatDuration(album.durationMs)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard__muted">
              No official Minecraft tracks were found in this Spotify window yet.
            </p>
          )}
        </section>

        <section className="dashboard-card">
          <h3>Not counted</h3>
          <p className="dashboard__muted">
            {excludedTracks.length} recent tracks were excluded because they are
            not on an approved Minecraft soundtrack album.
          </p>

          {excludedTracks.length ? (
            <ul className="excluded-list">
              {excludedTracks.slice(0, 5).map((item) => (
                <li key={`${item.track.id}-${item.played_at}`}>
                  {item.track.name} — {item.track.artists[0]?.name}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <section className="dashboard-card dashboard-card--wide">
        <h3>Counted tracks</h3>
        {tracks.length ? (
          <ol className="track-list">
            {tracks.map((item) => (
              <TrackRow key={`${item.track.id}-${item.played_at}`} item={item} />
            ))}
          </ol>
        ) : (
          <p className="dashboard__muted">
            Play some official Minecraft soundtrack music, then refresh this page.
          </p>
        )}
      </section>
    </section>
  );
}

export default ListeningDashboard;
