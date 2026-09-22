function formatDuration(durationMs) {
  return `${Math.round(durationMs / 60000)} min`;
}

function formatPlayedAt(playedAt) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(playedAt));
}

function SessionRow({ session }) {
  return (
    <li className="track-row">
      {session.imageUrl ? (
        <img className="track-row__art" src={session.imageUrl} alt="" />
      ) : (
        <div className="track-row__art track-row__art--empty" aria-hidden="true" />
      )}

      <div className="track-row__details">
        <strong>{session.trackName}</strong>
        <span>{session.artists}</span>
        <span className="track-row__album">{session.albumName}</span>
      </div>

      <div className="track-row__meta">
        <span>{formatDuration(session.durationMs)}</span>
        <time dateTime={session.playedAt}>
          {formatPlayedAt(session.playedAt)}
        </time>
      </div>
    </li>
  );
}

function SessionHistory({
  sessions,
  isConfigured,
  isSignedIn,
  isLoading,
  error,
  onSignIn,
  onSignOut,
  onRefresh,
}) {
  return (
    <section className="dashboard-card session-history">
      <div className="session-history__heading">
        <div>
          <h2>Session history</h2>
          <p className="dashboard__muted">
            {isConfigured
              ? "Your counted Minecraft plays are saved privately to your account."
              : "Deploy the cloud storage API and add its URL to save listening history."}
          </p>
        </div>

        {isConfigured ? (
          <div className="session-history__actions">
            {isSignedIn ? (
              <>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  Refresh history
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={onSignOut}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button className="button" type="button" onClick={onSignIn}>
                Sign in to save history
              </button>
            )}
          </div>
        ) : null}
      </div>

      {error ? <p className="dashboard__error">{error}</p> : null}

      {!isConfigured ? (
        <p className="dashboard__muted session-history__message">
          Recent Spotify plays still work without cloud storage. Nothing is
          uploaded until you deploy and sign in.
        </p>
      ) : !isSignedIn ? (
        <p className="dashboard__muted session-history__message">
          Sign in with your tracker account to keep this history between
          browsers and devices.
        </p>
      ) : isLoading ? (
        <p className="dashboard__muted session-history__message">
          Loading saved Minecraft plays...
        </p>
      ) : sessions.length ? (
        <>
          <p className="dashboard__muted session-history__message">
            {sessions.length} saved Minecraft plays.
          </p>
          <ol className="track-list">
            {sessions.map((session) => (
              <SessionRow
                key={`${session.playedAt}-${session.trackId}`}
                session={session}
              />
            ))}
          </ol>
        </>
      ) : (
        <p className="dashboard__muted session-history__message">
          No Minecraft plays are saved yet. Connect Spotify, then refresh your
          recent listening.
        </p>
      )}
    </section>
  );
}

export default SessionHistory;
