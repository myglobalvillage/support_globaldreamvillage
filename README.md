# Global Dream Village – Support Console

Agent and admin console for support tickets (queue, replies, assignment, SLA, refund approvals).
A standalone React + Vite app that talks to the Global Dream Village backend over `/api`.

## Run locally
```bash
npm install
cp .env.example .env   # set VITE_BACKEND_TARGET
npm run dev            # http://localhost:3100
```

## Build / deploy
```bash
npm run build          # typecheck + production build
npm start              # serves dist and proxies /api to VITE_BACKEND_TARGET
```
Deployed on Railway (`railway.json`). Set `VITE_BACKEND_TARGET` as a service variable.

## Backend dependency
Uses these backend endpoints: `POST /api/auth/login` and `/api/support/*`
(tickets, messages, stats, agents, refund-request, refund-decision).
- Sign in with a user whose `role` is `agent` or `support_admin` (or an admin).
- The backend must allow this console's origin in its CORS list.
