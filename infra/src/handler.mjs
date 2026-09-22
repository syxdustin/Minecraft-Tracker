import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const database = DynamoDBDocumentClient.from(client);
const tableName = process.env.SESSIONS_TABLE;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function validateString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function getAuthenticatedUserId(event) {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;

  if (!userId) {
    const error = new Error("Sign-in is required.");
    error.statusCode = 401;
    throw error;
  }

  return userId;
}

function normaliseSession(userId, session) {
  const playedAt = validateString(session.playedAt, "playedAt");
  const trackId = validateString(session.trackId, "trackId");
  const durationMs = Number(session.durationMs);

  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error("durationMs must be a non-negative number.");
  }

  return {
    userId,
    playedAt,
    trackId,
    trackName: validateString(session.trackName, "trackName"),
    artists: validateString(session.artists, "artists"),
    albumId: validateString(session.albumId, "albumId"),
    albumName: validateString(session.albumName, "albumName"),
    imageUrl: typeof session.imageUrl === "string" ? session.imageUrl : "",
    durationMs,
  };
}

export const handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod;
    const userId = getAuthenticatedUserId(event);

    if (method === "GET") {
      const result = await database.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "#userId = :userId",
          ExpressionAttributeNames: {
            "#userId": "userId",
          },
          ExpressionAttributeValues: {
            ":userId": userId,
          },
          ScanIndexForward: false,
        })
      );

      return response(200, { sessions: result.Items || [] });
    }

    if (method === "POST") {
      const payload = JSON.parse(event.body || "{}");
      const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];

      if (sessions.length > 50) {
        throw new Error("A request can save at most 50 sessions.");
      }

      const uniqueSessions = new Map();

      for (const session of sessions) {
        const item = normaliseSession(userId, session);
        uniqueSessions.set(`${item.playedAt}#${item.trackId}`, item);
      }

      await Promise.all(
        [...uniqueSessions.values()].map((item) =>
          database.send(
            new PutCommand({
              TableName: tableName,
              Item: item,
            })
          )
        )
      );

      return response(200, { saved: uniqueSessions.size });
    }

    return response(405, { error: "Method not allowed." });
  } catch (error) {
    console.error(error);

    return response(error.statusCode || 400, {
      error: error.message || "Could not update session history.",
    });
  }
};
