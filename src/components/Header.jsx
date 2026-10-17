function Header({ isConnected, onConnect, onDisconnect }) {
  return (
    <header className="site-header">
      <h1>Spotify Sync</h1>

      <div className="site-header__actions">
        {isConnected ? (
          <button
            className="button button--quiet"
            type="button"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
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
