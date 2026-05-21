# CryptoTrade Platform

A full-stack mobile-first binary demo trading platform with real-time price feeds, candlestick charts, and admin controls.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/crypto-app run dev` — run the frontend (port 25012)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild shared libs (api-zod, api-client-react)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React + Vite, TailwindCSS, TradingView Lightweight Charts, Socket.IO client, TanStack Query, Wouter routing
- **Backend**: Express 5 + MongoDB (Mongoose), Socket.IO, JWT auth (jsonwebtoken + bcryptjs)
- **Codegen**: Orval from OpenAPI spec → React Query hooks + Zod schemas
- **Build**: esbuild (API server CJS bundle)

## Required Environment Variables

- `MONGODB_URI` — MongoDB connection string (set as secret)
- `SESSION_SECRET` — session secret (set as secret)
- `JWT_SECRET` — JWT signing secret (defaults to `crypto_jwt_secret_dev` if unset)
- `PORT` — injected by Replit workflow runner

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all endpoints)
- `lib/api-zod/src/index.ts` — manually maintained re-exports (do NOT regenerate; avoid `ListCandlesParams` collision)
- `lib/api-client-react/src/custom-fetch.ts` — JWT auth injector for all API calls (reads `crypto_token` from localStorage)
- `artifacts/api-server/src/` — Express backend
  - `models/` — Mongoose models: User, Transaction, Trade, Notification, MarketPrice, Candle
  - `routes/` — auth, wallet, trades, markets, notifications, admin
  - `services/marketSimulator.ts` — price ticks every 2s, Socket.IO `price_update` + `candle_update`
  - `services/tradeSettler.ts` — settles expired trades every 3s, emits `trade_settled`
  - `middlewares/auth.ts` — JWT middleware, checkFrozen, adminMiddleware
- `artifacts/crypto-app/src/` — React frontend
  - `pages/` — login, register, dashboard, trade-list, trade (chart), history, wallet, profile, notifications, admin/*
  - `components/CandleChart.tsx` — TradingView Lightweight Charts integration
  - `hooks/useSocket.ts` — Socket.IO client with subscribe helper
  - `contexts/AuthContext.tsx` — JWT + user stored in localStorage (`crypto_token`, `crypto_user`)

## Architecture decisions

- **Admin-controlled deposits/withdrawals**: All deposits and withdrawals are pending until admin approves. Balance is only modified on approval.
- **Binary options**: Trade amount is deducted immediately on entry. Settlement restores amount + profit (win) or writes off amount (loss).
- **Simulated markets**: 5 pairs (BTCUSDT, BTCINR, ETHUSDT, ETHINR, BNBUSDT) with random walk prices. Candles stored per minute in MongoDB.
- **Socket.IO rooms**: Users join `user_<id>` for private trade settlement notifications, and `symbol_<sym>` for price/candle updates.
- **No Drizzle/PostgreSQL**: This project uses MongoDB/Mongoose (not the default Drizzle stack). `lib/db` is not used.

## Product

- Users register and get $10,000 virtual balance
- Deposit/withdrawal requests go to admin for approval
- Markets page shows 5 live crypto pairs with real-time price ticks
- Trade page shows 1-minute candlestick chart + "Buy UP / Buy DOWN" flow with 60/120/180/240s timers
- Profit percentages: 60s=85%, 120s=80%, 180s=75%, 240s=70%
- Admin dashboard: manage users (freeze/unfreeze, balance adjustment), approve/reject transactions, force trade outcomes

## User preferences

- Dark theme forced globally (class="dark" on html element)
- Mobile-first layout with bottom navigation

## Gotchas

- `lib/api-zod/src/index.ts` must NOT be regenerated — it has a manual explicit re-export list to avoid the `ListCandlesParams` naming collision from codegen
- Admin user must be manually set in MongoDB (`role: "admin"`). Default registered users get `role: "user"`
- Demo admin credentials: `admin@crypto.com` / `admin123` (created and promoted during dev)
- Socket.IO path is `/socket.io`. The reverse proxy routes `/socket.io` through the same path.
- API server bundles to `dist/index.mjs` via esbuild. Changes require restart to rebuild.
