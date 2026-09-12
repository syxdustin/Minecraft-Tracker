const clientId = "e3e72ff226d64e66b49d63b04f630d1e";
const redirectUri = "http://127.0.0.1:5173/callback";

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

export { randomString, sha256, base64encode, loginWithSpotify, };