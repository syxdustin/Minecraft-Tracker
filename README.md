# Minecraft Music Tracker

A React dashboard that finds official Minecraft soundtrack plays in Spotify
recent history, groups them by album, and saves counted plays as cloud history.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev -- --host 127.0.0.1 --port 5173
```

## Cognito setup

The project uses your Cognito User Pool to protect cloud history.

- User Pool ID: `us-east-1_MSWmpq2eA`
- App Client ID: `25a6n05qh9ndqblur9n0oqsdag`
- Domain: `https://us-east-1mswmpq2ea.auth.us-east-1.amazoncognito.com`

In the Cognito app-client configuration, enable the authorization-code flow and
the `openid` and `email` scopes. Add these callback and logout URLs:

```text
http://127.0.0.1:5173/auth/callback
http://127.0.0.1:5173/
```

The React app uses PKCE, so the app client must not have a client secret.

## Deploy session history to AWS

The serverless API at `infra/` is secured by Cognito:

```text
React app → Cognito JWT → API Gateway → Lambda → DynamoDB
```

1. Install and configure the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
2. From the repository root, run:

   ```bash
   sam build --template-file infra/template.yaml
   sam deploy --guided
   ```

3. Copy the `SessionsApiUrl` output into `.env` as
   `VITE_SESSIONS_API_URL`.
4. Restart Vite.

For GitHub Pages, add the production callback and logout URLs to Cognito and
set the Vite environment variables in the deployment workflow.

## Current features

- Spotify Authorization Code with PKCE and token refresh
- Official Minecraft soundtrack filter
- Recent-track dashboard with album totals and exclusions
- Cognito-protected DynamoDB session-history API
