const COGNITO_ACCESS_TOKEN_KEY = "cognito_access_token";
const COGNITO_ID_TOKEN_KEY = "cognito_id_token";
const COGNITO_REFRESH_TOKEN_KEY = "cognito_refresh_token";
const COGNITO_EXPIRY_KEY = "cognito_token_expiry";
const COGNITO_VERIFIER_KEY = "cognito_code_verifier";
const TOKEN_EXPIRY_SAFETY_WINDOW = 60 * 1000;

function getCognitoDomain() {
  return import.meta.env.VITE_COGNITO_DOMAIN?.replace(/\/$/, "");
}

function getCognitoClientId() {
  return import.meta.env.VITE_COGNITO_CLIENT_ID;
}

function getRedirectUri() {
  return (
    import.meta.env.VITE_COGNITO_REDIRECT_URI ||
    `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`
  );
}

function assertCognitoConfig() {
  const domain = getCognitoDomain();
  const clientId = getCognitoClientId();

  if (!domain || !clientId) {
    throw new Error("Cognito is not configured yet.");
  }

  return { domain, clientId };
}

function randomString(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return result;
}

async function createCodeChallenge(codeVerifier) {
  const encodedVerifier = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", encodedVerifier);

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function saveCognitoTokens(tokenData) {
  const expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

  if (tokenData.access_token) {
    sessionStorage.setItem(COGNITO_ACCESS_TOKEN_KEY, tokenData.access_token);
  }

  if (tokenData.id_token) {
    sessionStorage.setItem(COGNITO_ID_TOKEN_KEY, tokenData.id_token);
  }

  if (tokenData.refresh_token) {
    sessionStorage.setItem(COGNITO_REFRESH_TOKEN_KEY, tokenData.refresh_token);
  }

  sessionStorage.setItem(COGNITO_EXPIRY_KEY, expiresAt.toString());
}

function clearCognitoSession() {
  sessionStorage.removeItem(COGNITO_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(COGNITO_ID_TOKEN_KEY);
  sessionStorage.removeItem(COGNITO_REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(COGNITO_EXPIRY_KEY);
  sessionStorage.removeItem(COGNITO_VERIFIER_KEY);
}

function isCognitoConfigured() {
  return Boolean(getCognitoDomain() && getCognitoClientId());
}

function isCognitoAuthenticated() {
  return Boolean(
    sessionStorage.getItem(COGNITO_ID_TOKEN_KEY) ||
      sessionStorage.getItem(COGNITO_REFRESH_TOKEN_KEY)
  );
}

async function loginWithCognito() {
  const { domain, clientId } = assertCognitoConfig();
  const codeVerifier = randomString(64);
  const codeChallenge = await createCodeChallenge(codeVerifier);

  sessionStorage.setItem(COGNITO_VERIFIER_KEY, codeVerifier);

  const authorizeUrl = new URL(`${domain}/oauth2/authorize`);
  authorizeUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    scope: "openid email",
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  }).toString();

  window.location.assign(authorizeUrl.toString());
}

async function completeCognitoLogin(code) {
  const { domain, clientId } = assertCognitoConfig();
  const codeVerifier = sessionStorage.getItem(COGNITO_VERIFIER_KEY);

  if (!codeVerifier) {
    throw new Error("Sign-in expired. Please try again.");
  }

  const response = await fetch(`${domain}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      redirect_uri: getRedirectUri(),
      code_verifier: codeVerifier,
    }),
  });

  const tokenData = await response.json();

  if (!response.ok || !tokenData.id_token) {
    throw new Error(tokenData.error_description || "Could not sign in.");
  }

  saveCognitoTokens(tokenData);
  sessionStorage.removeItem(COGNITO_VERIFIER_KEY);
}

async function refreshCognitoSession() {
  const { domain, clientId } = assertCognitoConfig();
  const refreshToken = sessionStorage.getItem(COGNITO_REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    throw new Error("Cloud session expired. Please sign in again.");
  }

  const response = await fetch(`${domain}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  });

  const tokenData = await response.json();

  if (!response.ok || !tokenData.id_token) {
    clearCognitoSession();
    throw new Error(tokenData.error_description || "Cloud session expired.");
  }

  saveCognitoTokens({
    ...tokenData,
    refresh_token: tokenData.refresh_token || refreshToken,
  });

  return tokenData.id_token;
}

async function getCognitoIdToken() {
  const idToken = sessionStorage.getItem(COGNITO_ID_TOKEN_KEY);
  const expiresAt = Number(sessionStorage.getItem(COGNITO_EXPIRY_KEY));

  if (idToken && expiresAt > Date.now() + TOKEN_EXPIRY_SAFETY_WINDOW) {
    return idToken;
  }

  return refreshCognitoSession();
}

function logoutFromCognito() {
  if (!isCognitoConfigured()) {
    clearCognitoSession();
    return;
  }

  const { domain, clientId } = assertCognitoConfig();
  clearCognitoSession();

  const logoutUrl = new URL(`${domain}/logout`);
  logoutUrl.search = new URLSearchParams({
    client_id: clientId,
    logout_uri: window.location.origin + import.meta.env.BASE_URL,
  }).toString();

  window.location.assign(logoutUrl.toString());
}

export {
  completeCognitoLogin,
  getCognitoIdToken,
  isCognitoAuthenticated,
  isCognitoConfigured,
  loginWithCognito,
  logoutFromCognito,
};
