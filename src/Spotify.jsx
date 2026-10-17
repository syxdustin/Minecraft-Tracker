const clientId = "e3e72ff226d64e66b49d63b04f630d1e";
const ACCESS_TOKEN_KEY = "spotify_access_token";
const REFRESH_TOKEN_KEY = "spotify_refresh_token";
const TOKEN_EXPIRY_KEY = "spotify_token_expiry";
const TOKEN_SCOPE_KEY = "spotify_token_scope";
const SPOTIFY_SCOPE = "user-read-playback-state user-modify-playback-state";
const TOKEN_EXPIRY_SAFETY_WINDOW = 60 * 1000;

function getRedirectUri() {
  return (
    import.meta.env.VITE_SPOTIFY_REDIRECT_URI ||
    `${window.location.origin}${import.meta.env.BASE_URL}callback`
  );
}

function randomString(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return result;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);

  return window.crypto.subtle.digest("SHA-256", data);
}

function base64encode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function saveToken(tokenData) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokenData.access_token);

  const expiresAt = Date.now() + tokenData.expires_in * 1000;
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());

  if (tokenData.refresh_token) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refresh_token);
  }

  if (tokenData.scope) {
    sessionStorage.setItem(TOKEN_SCOPE_KEY, tokenData.scope);
  }
}

function clearSpotifySession() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(TOKEN_SCOPE_KEY);
  localStorage.removeItem("code_verifier");
}

function hasRequiredScope() {
  const grantedScopes = (sessionStorage.getItem(TOKEN_SCOPE_KEY) || "").split(" ");

  return SPOTIFY_SCOPE.split(" ").every((scope) => grantedScopes.includes(scope));
}

function hasSpotifySession() {
  const hasToken = Boolean(
    sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
      sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );

  // Sessions from older versions of the app were granted different scopes.
  if (hasToken && !hasRequiredScope()) {
    clearSpotifySession();
    return false;
  }

  return hasToken;
}

async function loginWithSpotify() {
  const codeVerifier = randomString(64);

  localStorage.setItem("code_verifier", codeVerifier);

  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  const redirectUri = getRedirectUri();

  const authUrl = new URL("https://accounts.spotify.com/authorize");

  authUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPE,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  }).toString();

  window.location.href = authUrl.toString();
}

async function getToken(code) {
  const codeVerifier = localStorage.getItem("code_verifier");
  const redirectUri = getRedirectUri();

  if (!codeVerifier) {
    throw new Error("Spotify sign-in expired. Please try connecting again.");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || "Could not get Spotify token");
  }

  saveToken(data);
  localStorage.removeItem("code_verifier");

  return data;
}

async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    throw new Error("Spotify session expired. Please reconnect.");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    clearSpotifySession();
    throw new Error(data.error_description || "Spotify session expired. Please reconnect.");
  }

  saveToken({
    ...data,
    refresh_token: data.refresh_token || refreshToken,
  });

  return data.access_token;
}

async function getValidAccessToken() {
  const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY));

  if (
    accessToken &&
    expiresAt > Date.now() + TOKEN_EXPIRY_SAFETY_WINDOW
  ) {
    return accessToken;
  }

  return refreshAccessToken();
}

async function spotifyRequest(path, { method = "GET", body } = {}) {
  const accessToken = await getValidAccessToken();

  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204 || response.status === 202) {
    return null;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.error?.message || "Spotify request failed");
    error.status = response.status;
    error.reason = data?.error?.reason;
    throw error;
  }

  return data;
}

function getPlaybackState() {
  return spotifyRequest("/me/player?additional_types=episode");
}

async function getAvailableDeviceId() {
  const data = await spotifyRequest("/me/player/devices");
  const devices = data?.devices || [];
  const device =
    devices.find((candidate) => candidate.is_active) ||
    devices.find((candidate) => !candidate.is_restricted);

  return device?.id || null;
}

async function withDevice(path, deviceId) {
  const id = deviceId || (await getAvailableDeviceId());

  if (!id) {
    const error = new Error(
      "No Spotify device found. Open Spotify on your phone or computer."
    );
    error.reason = "NO_ACTIVE_DEVICE";
    throw error;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}device_id=${encodeURIComponent(id)}`;
}

async function playTrack(uri, positionMs, deviceId) {
  return spotifyRequest(await withDevice("/me/player/play", deviceId), {
    method: "PUT",
    body: { uris: [uri], position_ms: Math.max(0, Math.round(positionMs)) },
  });
}

async function pausePlayback(deviceId) {
  return spotifyRequest(await withDevice("/me/player/pause", deviceId), {
    method: "PUT",
  });
}

async function seekPlayback(positionMs, deviceId) {
  const position = Math.max(0, Math.round(positionMs));

  return spotifyRequest(
    await withDevice(`/me/player/seek?position_ms=${position}`, deviceId),
    { method: "PUT" }
  );
}

async function findTrackUriByIsrc(isrc) {
  const data = await spotifyRequest(
    `/search?type=track&limit=1&q=${encodeURIComponent(`isrc:${isrc}`)}`
  );

  return data?.tracks?.items?.[0]?.uri || null;
}

export {
  randomString,
  sha256,
  base64encode,
  loginWithSpotify,
  getToken,
  getPlaybackState,
  playTrack,
  pausePlayback,
  seekPlayback,
  findTrackUriByIsrc,
  hasSpotifySession,
  clearSpotifySession,
};
