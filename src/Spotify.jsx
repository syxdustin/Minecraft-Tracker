const clientId = "e3e72ff226d64e66b49d63b04f630d1e";
const redirectUri = "http://127.0.0.1:5173/callback";
const ACCESS_TOKEN_KEY = "spotify_access_token";
const TOKEN_EXPIRY_KEY = "spotify_token_expiry";

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

async function loginWithSpotify() {
    const codeVerifier = randomString(64);

    localStorage.setItem("code_verifier", codeVerifier);

    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    const scope = "user-read-recently-played";

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

    sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);

    const expiresAt = Date.now() + data.expires_in * 1000;
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());

    localStorage.removeItem("code_verifier");

    return data;
}
async function getRecentlyPlayed() {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const expiresAt = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY));

    if (!accessToken || Date.now() >= expiresAt) {
        throw new Error("Spotify token is missing or expired");
    }

    const response = await fetch(
        "https://api.spotify.com/v1/me/player/recently-played",
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

export { randomString, sha256, base64encode, loginWithSpotify, getToken, getRecentlyPlayed };