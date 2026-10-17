# Spotify Sync

A static React app for listening to Spotify together. One person hosts a room
and plays music in their own Spotify app; anyone who joins with the room code
hears the same track at the same position and follows along when the host
skips, seeks or pauses.

There is no backend. Browsers connect to each other directly over WebRTC
(PeerJS), and each person controls their own Spotify playback with their own
login.

## Requirements

- Spotify Premium for everyone in the room (Spotify only allows playback
  control through its API on Premium accounts).
- Spotify open on a phone, computer or speaker for each listener.
- While the Spotify app is in development mode, each listener's Spotify email
  must be added under **User Management** in the Spotify Developer Dashboard.

## How syncing works

- The host polls their Spotify playback about once a second and sends the
  track, position and play/pause state to everyone in the room.
- Each guest measures the connection delay to the host, compares the host's
  estimated position with its own, and starts, pauses or seeks its Spotify
  player when they differ by more than 1.5 seconds.
- Tracks are shared with their ISRC as well as their Spotify URI, so a future
  client on another streaming service can find the same recording.

Expect listeners to stay within about a second of each other: good for
listening together remotely, not tight enough for speakers in the same room.

## Run locally

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

In the Spotify Developer Dashboard, add this local redirect URI:

```text
http://127.0.0.1:5173/callback
```

The callback is derived from the current page URL, so no local environment
variables are required for the normal setup.

Room connections use the free public PeerJS broker. To use your own
[PeerServer](https://github.com/peers/peerjs-server) instead, set the
`VITE_PEER_*` variables shown in `.env.example`.

## Publish to GitHub Pages

1. In **Settings → Pages**, choose **GitHub Actions** as the source.
2. In the Spotify Developer Dashboard, add this redirect URI:

   ```text
   https://syxdustin.github.io/Minecraft-Tracker/callback
   ```

3. Push to `main` and wait for the **Deploy GitHub Pages** workflow.

The live site is:

```text
https://syxdustin.github.io/Minecraft-Tracker/
```

If you rename the repository, update `base` in `vite.config.js` and the
redirect URI in the Spotify Developer Dashboard to match the new Pages URL.
