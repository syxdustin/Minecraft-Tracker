import { getCognitoIdToken } from "../auth/cognito.js";

const API_URL = import.meta.env.VITE_SESSIONS_API_URL?.replace(/\/$/, "");

function isSessionApiConfigured() {
  return Boolean(API_URL);
}

async function request(path, options = {}) {
  if (!API_URL) {
    throw new Error("Session history is not configured yet.");
  }

  const idToken = await getCognitoIdToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not update session history.");
  }

  return data;
}

async function loadSessions() {
  const data = await request("/sessions");

  return data.sessions || [];
}

async function saveSessions(sessions) {
  if (!sessions.length) {
    return;
  }

  await request("/sessions", {
    method: "POST",
    body: JSON.stringify({ sessions }),
  });
}

export { isSessionApiConfigured, loadSessions, saveSessions };
