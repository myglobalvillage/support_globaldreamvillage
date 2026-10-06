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
`VITE_BACKEND_TARGET` must be the backend **origin only** (no `/api` suffix), e.g. `https://backend-production-18db.up.railway.app`.

## Features
- Queue: filters, search, sorting, pagination (25/page), bulk assign/status/priority, saved views
- New-ticket alerts (sound, toast, desktop notification) and unassigned count in the tab title
- Editable canned replies with `{{customer}}`, `{{agent}}`, `{{ticket}}` variables (stored in the browser)
- Customer panel, booking context, refund approval flow, activity log
- Status workflow rules (closed tickets can only be reopened; confirmation when resolving/closing)
- Collision warning when another agent replies while you are typing

## Keyboard shortcuts
`j`/`k` next/previous ticket · `r` reply · `n` new ticket · `/` search · `Esc` close · `Ctrl+Enter` send · `?` help

## Dev scripts
```bash
npm test       # unit tests (vitest)
npm run lint   # eslint
npm run format # prettier
```

## Backend dependency
Uses these backend endpoints: `POST /api/auth/login` and `/api/support/*`
(tickets, messages, stats, agents, refund-request, refund-decision).
- Sign in with a user whose `role` is `agent` or `support_admin` (or an admin).
- The backend must allow this console's origin in its CORS list.
