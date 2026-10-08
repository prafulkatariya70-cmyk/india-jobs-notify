# Govt Job Hub

I want to build a govt job portal in india that automatically updates in the app about all the state and central govt jobs in the portal automatically

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4e05c545-c622-4d25-9f74-24686b4feac0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```


## Production API

Rozgaar reads live jobs, profiles, recommendations, and application tracking from the Gov-AI FastAPI backend.

Set `VITE_GOV_API_URL` to the deployed Gov-AI API base ending in `/api` in the frontend deployment environment. For local development the client defaults to `http://localhost:8000/api`.

The frontend forwards the signed-in Supabase session to Gov-AI. The backend can validate Supabase JWTs using the project's JWKS endpoint; keep `SUPABASE_URL` and `COMPATIBILITY_ALLOW_ANONYMOUS` configured on the backend and never expose server secrets in `VITE_*` variables.
