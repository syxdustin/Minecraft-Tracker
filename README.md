# Minecraft Music Tracker

A static React visualizer for your recent official Minecraft soundtrack plays on
Spotify. It groups the current Spotify snapshot by album and displays album art
as bubbles sized by listening time.

The site does not create an account or save a listening history. Connect Spotify
again whenever you want a fresh snapshot.

## Features

- Spotify Authorization Code flow with PKCE and token refresh
- Official Minecraft soundtrack filtering
- Album-art bubble visualizer with listening time per album
- GitHub Pages deployment

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
