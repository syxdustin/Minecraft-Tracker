# Minecraft Music Tracker

A React dashboard that finds official Minecraft soundtrack plays in Spotify
recent history, groups them by album, and saves counted plays as cloud history.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev -- --host 127.0.0.1 --port 5173
```

Spotify supports the local loopback callback already configured in the app:

```text
http://127.0.0.1:5173/callback
```

Cognito requires HTTPS except for `localhost`, while Spotify requires the
`127.0.0.1` loopback address. Test the combined Spotify and cloud-history
flow on GitHub Pages instead of local HTTP.

## Cognito setup

The project uses your Cognito User Pool to protect cloud history.

- User Pool ID: `us-east-1_MSWmpq2eA`
- App Client ID: `25a6n05qh9ndqblur9n0oqsdag`
- Domain: `https://us-east-1mswmpq2ea.auth.us-east-1.amazoncognito.com`

In the Cognito app-client configuration, use the authorization-code flow with
the `openid` and `email` scopes. The app client must not have a client
secret. Add these GitHub Pages URLs:

```text
https://syxdustin.github.io/Minecraft-Tracker/auth/callback
https://syxdustin.github.io/Minecraft-Tracker/
```

## Publish to GitHub Pages

The repository contains a workflow that builds and deploys the site on every
push to `main`.

1. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the
   source.
2. In the Spotify Developer Dashboard, add this redirect URI:

   ```text
   https://syxdustin.github.io/Minecraft-Tracker/callback
   ```

3. Push to `main` and wait for the **Deploy GitHub Pages** workflow to
   finish. The site URL is:

   ```text
   https://syxdustin.github.io/Minecraft-Tracker/
   ```

The callback rewrite files let both OAuth providers return directly to
`/callback` or `/auth/callback` without GitHub Pages returning a 404.

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

3. Copy the `SessionsApiUrl` output.
4. In GitHub, open **Settings → Secrets and variables → Actions → Variables**.
   Create the repository variable `VITE_SESSIONS_API_URL` and paste that
   output as its value.
5. Re-run the Pages workflow or push another commit to `main`.

The API URL is public, but the API accepts requests only with a valid Cognito
token. Do not store a client secret in GitHub or in the browser.

## Current features

- Spotify Authorization Code with PKCE and token refresh
- Official Minecraft soundtrack filter
- Recent-track dashboard with album totals and exclusions
- Cognito-protected DynamoDB session history
- Date filtering and a 365-day listening heatmap
