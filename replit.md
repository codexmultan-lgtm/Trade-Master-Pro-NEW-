# CryptoTrade Platform

A full-stack mobile-first binary demo trading platform with real-time price feeds, candlestick charts, admin controls, and full platform settings management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/crypto-app run dev` — run the frontend (port 25012)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild shared libs (api-zod, api-client-react)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec

## Admin withdrawal account numbers

- Admin → Users → User Details includes a **Withdrawal Account** card for editing an existing saved account number.
- Only the saved account number and the account number on **pending** withdrawal requests change. Approved/rejected transaction history, account holder, currency, bank details, balances, and all other transaction details stay unchanged.
- The current saved destination is shown in the user's Profile and wallet form. Future withdrawal requests use the updated saved number.
- USDT wallet addresses and accounts that have not been saved are read-only in this card.
- `pnpm --filter @workspace/api-server run test:withdrawal-account` tests persistence, admin-only access, validation, a demo withdrawal and approval, and cleanup in a disposable MongoDB instance. It never uses `MONGODB_URI`. Test binaries are cached under `.cache/`, excluded from Git and deployment.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE=$(command -v chromium) pnpm --filter @workspace/crypto-app exec playwright test --config playwright.config.ts e2e/admin-withdrawal-account.spec.ts e2e/profile-withdrawal-account.spec.ts --workers=2` checks admin editing and that users see the current saved account on Profile.
- Use Node.js 24 for the current dependency toolchain. Blocked package versions were updated within their existing major versions to allow installation and API generation.

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
  - `models/` — Mongoose models: User, Transaction, Trade, Notification, MarketPrice, Candle, TradeSetting, **PlatformSettings**
  - `routes/` — auth, wallet, trades, markets, notifications, admin, **settings** (public)
  - `services/marketSimulator.ts` — price ticks every 2s, Socket.IO `price_update` + `candle_update`
  - `services/tradeSettler.ts` — settles expired trades every 3s, emits `trade_settled`; uses `lossPercent` from Trade doc
  - `middlewares/auth.ts` — JWT middleware, checkFrozen, adminMiddleware
- `artifacts/crypto-app/src/` — React frontend
  - `pages/` — login, register, dashboard, trade-list, trade (chart), history, wallet, profile, notifications, admin/*
  - `pages/admin/settings.tsx` — **comprehensive admin settings page** (currency, profit %, limits, pairs, outcome control)
  - `components/CandleChart.tsx` — TradingView Lightweight Charts integration
  - `hooks/useSocket.ts` — Socket.IO client with subscribe helper
  - `contexts/AuthContext.tsx` — JWT + user stored in localStorage (`crypto_token`, `crypto_user`)
  - `contexts/PlatformSettingsContext.tsx` — fetches `/api/settings` and exposes platform settings app-wide
  - `lib/symbols.ts` — `symbolToDisplay()` helper (BTCPKR → "BTC/PKR"), `getQuoteAsset()`, `ALL_SYMBOLS`
  - `lib/currency.ts` — `formatPKR()`, `formatMarketPrice()`, `formatAmount()` utilities

## Architecture decisions

- **Admin-controlled deposits/withdrawals**: All deposits and withdrawals are pending until admin approves. Balance is only modified on approval.
- **Binary options**: Trade amount is deducted immediately on entry. Settlement restores amount + profit (win) or refunds `amount*(1-lossPercent/100)` (loss).
- **Simulated markets**: 10 pairs (BTCUSDT, BTCPKR, BTCINR, ETHUSDT, ETHPKR, ETHINR, BNBUSDT, BNBPKR, USDTPKR, USDTINR) with random walk prices. Candles stored per minute in MongoDB.
- **Trade outcome control**: `TradeSetting` collection stores per-symbol outcome override. Admin sets `auto` (price-based), `win`, or `loss` via `POST /api/admin/trade-settings`. Also accessible from `/admin/settings`.
- **Platform Settings**: Singleton `PlatformSettings` document in MongoDB. Controls: active currency (PKR/USD/INR/GBP), profit % per duration (60s/120s/180s/240s), loss %, global min/max trade amounts, enabled trading pairs.
- **Dynamic profit/loss**: Trade creation reads from `PlatformSettings` and stores `profitPercent` + `lossPercent` on the Trade document. Settler uses these stored values — no live setting dependency at settlement time.
- **Symbol display**: Internal symbols use no separator (BTCPKR). Frontend displays as BTC/PKR via `symbolToDisplay()`. Backend validates against `enabledSymbols` from `PlatformSettings`.
- **Socket.IO rooms**: Users join `user_<id>` for private trade settlement notifications, and `symbol_<sym>` for price/candle updates.
- **No Drizzle/PostgreSQL**: This project uses MongoDB/Mongoose (not the default Drizzle stack). `lib/db` is not used.

## Product

- Users register with ₨0 PKR virtual balance; deposit/withdrawal requests go to admin for approval
- All wallet balances and trade amounts shown in PKR (₨) by default (admin can switch platform currency)
- Pakistani payment methods: EasyPaisa, JazzCash, SadaPay, NayaPay, Bank Transfer, Crypto
- Markets page shows 10 live crypto pairs with real-time price ticks in BTC/PKR format
- Trade page shows 1-minute candlestick chart + "Buy UP / Buy DOWN" flow with 60/120/180/240s timers
- Profit percentages controlled by admin (defaults: 60s=85%, 120s=80%, 180s=75%, 240s=70%)
- Admin dashboard: manage users (freeze/unfreeze, balance adjustment, wallet reset), approve/reject transactions, force trade outcomes
- Admin trade outcome control: per-symbol AUTO / FORCE WIN / FORCE LOSS toggle (on both dashboard and settings page)
- **Admin Settings page** (`/admin/settings`): currency, profit %, loss %, min/max trade amounts, enable/disable pairs, outcome control
- Admin login redirects directly to /admin — user pages are blocked for admin accounts
- Admin Logout button properly clears tokens and redirects to /login

## User preferences

- Dark theme forced globally (class="dark" on html element)
- Mobile-first layout with bottom navigation

## Gotchas

- `lib/api-zod/src/index.ts` must NOT be regenerated — it has a manual explicit re-export list to avoid the `ListCandlesParams` naming collision from codegen
- Admin user must be manually set in MongoDB (`role: "admin"`). Default registered users get `role: "user"`
- Demo admin credentials: `admin@crypto.com` / `admin123` (created and promoted during dev)
- Socket.IO path is `/socket.io`. The reverse proxy routes `/socket.io` through the same path.
- API server bundles to `dist/index.mjs` via esbuild. Changes require restart to rebuild.
- `PlatformSettings` collection is a singleton (one document). Created automatically on first API call.
- Trade amount min/max is validated server-side from `PlatformSettings.minTradeAmount` / `maxTradeAmount`.
