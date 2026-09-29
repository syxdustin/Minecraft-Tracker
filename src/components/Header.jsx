function Header({
  isConnected,
  isLoading,
  onConnect,
  onDisconnect,
  onRefresh,
}) {
  return (
    <header className="site-header">
      <h1>Minecraft Music Tracker</h1>

      <div className="site-header__actions">
        {isConnected ? (
          <>
            <button
              className="button button--quiet"
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? "Loading…" : "Refresh"}
            </button>
            <button
              className="button"
              type="button"
              onClick={onDisconnect}
            >
              Disconnect
            </button>
          </>
        ) : (
          <button className="button" type="button" onClick={onConnect}>
            Connect Spotify
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
