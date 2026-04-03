This is the Next.js frontend for Brazdes.

## Local development

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For local development against the remote Azure backend, use:

```env
NEXT_PUBLIC_API_URL=/api-proxy
NEXT_SERVER_API_PROXY_TARGET=https://your-azure-app.azurewebsites.net
```

`NEXT_PUBLIC_API_URL` defaults to `/api-proxy`, so the frontend can stay same-origin while the server-side route forwards requests to Azure.

## Vercel deployment

For a fully remote setup on Vercel + Azure App Service, configure these Project Environment Variables in Vercel:

```env
NEXT_PUBLIC_API_URL=/api-proxy
NEXT_SERVER_API_PROXY_TARGET=https://your-azure-app.azurewebsites.net
```

This keeps browser traffic on the Vercel origin and forwards API calls server-side to Azure, avoiding accidental fallback to a local backend and avoiding browser CORS issues.
