const clientId = "e3e72ff226d64e66b49d63b04f630d1e";
const ACCESS_TOKEN_KEY = "spotify_access_token";
const REFRESH_TOKEN_KEY = "spotify_refresh_token";
const TOKEN_EXPIRY_KEY = "spotify_token_expiry";
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
}

function clearSpotifySession() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem("code_verifier");
}

function hasSpotifySession() {
  return Boolean(
    sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
      sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

async function loginWithSpotify() {
  const codeVerifier = randomString(64);

  localStorage.setItem("code_verifier", codeVerifier);

  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  const scope = "user-read-recently-played";
  const redirectUri = getRedirectUri();

  const authUrl = new URL("https://accounts.spotify.com/authorize");

  authUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scope,
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

async function getRecentlyPlayed() {
  const accessToken = await getValidAccessToken();

  const response = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=50",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Spotify request failed");
  }

  return data;
}

export {
  randomString,
  sha256,
  base64encode,
  loginWithSpotify,
  getToken,
  getRecentlyPlayed,
  hasSpotifySession,
  clearSpotifySession,
};
