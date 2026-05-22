# CryptoTrade Platform

A full-stack mobile-first binary options demo trading platform built with the MERN stack. Features real-time candlestick charts, Socket.IO price feeds, JWT authentication, and a complete admin control panel.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [MongoDB Configuration](#mongodb-configuration)
- [Local Development Setup](#local-development-setup)
- [Socket.IO Setup](#socketio-setup)
- [Admin Panel](#admin-panel)
- [Demo Credentials](#demo-credentials)
- [Replit Deployment](#replit-deployment)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, TailwindCSS, TanStack Query, Wouter, Framer Motion |
| Charts | TradingView Lightweight Charts v5 |
| Backend | Express 5, Node.js 24, TypeScript 5.9 |
| Database | MongoDB with Mongoose ODM |
| Real-time | Socket.IO (WebSocket + polling fallback) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Monorepo | pnpm workspaces |
| Codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |

---

## Features

### User Features
- Landing page with live market preview and Framer Motion animations
- Register/login with JWT auth stored in localStorage
- Real-time candlestick charts (1-minute candles, auto-updating via Socket.IO)
- Binary options trades: BUY UP / BUY DOWN on 5 crypto pairs
- Trade durations: 60s (85% profit), 120s (80%), 180s (75%), 240s (70%)
- Auto trade settlement with P&L notifications
- Wallet: deposit/withdrawal requests (admin approval required)
- Trade history with win/loss stats
- Real-time notifications via Socket.IO
- Mobile-first responsive layout with bottom navigation

### Admin Features
- Admin dashboard with platform stats (users, trades, deposits, P&L)
- User management: search, freeze/unfreeze, view details
- Balance management: credit/debit individual users
- Wallet reset: zero out all wallet fields for a user
- Transaction approval/rejection (deposits and withdrawals)
- Trade management: force win/loss on any active or settled trade
- Full transaction history across all users

---

## Project Structure

```
.
├── artifacts/
│   ├── api-server/          # Express 5 backend
│   │   └── src/
│   │       ├── models/      # Mongoose: User, Trade, Transaction, Notification, MarketPrice, Candle
│   │       ├── routes/      # auth, wallet, trades, markets, notifications, admin
│   │       ├── services/    # marketSimulator.ts, tradeSettler.ts
│   │       └── middlewares/ # auth.ts (JWT + frozen check + admin check)
│   └── crypto-app/          # React + Vite frontend
│       └── src/
│           ├── pages/       # landing, login, register, dashboard, trade, wallet, history, profile, notifications, admin/*
│           ├── components/  # CandleChart, layout (Header, BottomNav, AppLayout)
│           ├── hooks/       # useSocket.ts
│           └── contexts/    # AuthContext.tsx
├── lib/
│   ├── api-spec/            # openapi.yaml (source of truth)
│   ├── api-zod/             # Generated + manually maintained Zod schemas
│   └── api-client-react/   # Generated React Query hooks (Orval)
└── pnpm-workspace.yaml
```

---

## Prerequisites

- Node.js 20+ (Node 24 recommended)
- pnpm 9+
- MongoDB Atlas account or local MongoDB instance

Install pnpm globally if needed:
```bash
npm install -g pnpm
```

---

## Environment Variables

Create a `.env` file in the `artifacts/api-server/` directory (or set as secrets in Replit):

```env
# Required
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

# Required — used for session/cookie signing
SESSION_SECRET=your_super_secret_session_key_here

# Optional — defaults to crypto_jwt_secret_dev in development
JWT_SECRET=your_jwt_secret_key_here

# Injected by Replit workflow runner automatically
PORT=8080
```

**Important:** Never commit real secrets to version control. Use Replit Secrets (see [Replit Deployment](#replit-deployment)) or a `.env` file excluded by `.gitignore`.

---

## MongoDB Configuration

### Option A: MongoDB Atlas (Recommended)

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user with read/write access
3. Whitelist your IP (or use `0.0.0.0/0` for Replit)
4. Copy the connection string: `mongodb+srv://<user>:<pass>@cluster.mongodb.net/cryptotrade`
5. Set it as `MONGODB_URI`

### Option B: Local MongoDB

```bash
# Start local MongoDB
mongod --dbpath /data/db

# Connection string
MONGODB_URI=mongodb://localhost:27017/cryptotrade
```

### Creating the Admin User

After your first server start, register a user normally, then promote them to admin via MongoDB shell or Atlas UI:

```javascript
// In MongoDB shell or Atlas Query Editor
db.users.updateOne(
  { email: "admin@crypto.com" },
  { $set: { role: "admin" } }
)
```

---

## Local Development Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd crypto-trade-platform
pnpm install
```

### 2. Set environment variables

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
# Edit .env with your MongoDB URI and secrets
```

### 3. Start the API server

```bash
pnpm --filter @workspace/api-server run dev
# Server starts on http://localhost:8080
# Logs: MongoDB connected, Markets initialized
```

### 4. Start the frontend (new terminal)

```bash
pnpm --filter @workspace/crypto-app run dev
# Frontend starts on http://localhost:25012
```

### 5. Access the app

Open [http://localhost:25012](http://localhost:25012) in your browser.

### Regenerating API hooks (after OpenAPI spec changes)

```bash
pnpm --filter @workspace/api-spec run codegen
```

> **Warning:** Do NOT regenerate `lib/api-zod/src/index.ts` — it has manual re-exports to avoid the `ListCandlesParams` naming collision. Only `lib/api-client-react/src/generated/` files should be regenerated.

---

## Socket.IO Setup

The backend uses Socket.IO mounted on the same Express server at path `/socket.io`.

### Events emitted by the server

| Event | Payload | Description |
|---|---|---|
| `price_update` | `{ symbol, price, change24h }` | Emitted every 2s to `symbol_<sym>` room |
| `candle_update` | `{ symbol, candle }` | Emitted on candle tick to `symbol_<sym>` room |
| `trade_settled` | `{ tradeId, result, profitLoss }` | Emitted to `user_<id>` room on trade expiry |

### Client connection (already configured)

```typescript
// artifacts/crypto-app/src/hooks/useSocket.ts
// Connects to the same origin using BASE_URL prefix
// Automatically joins user room on auth
```

### Socket.IO path in reverse proxy

The Replit proxy routes `/socket.io` path-through. The Socket.IO path is `/socket.io` (default) and the frontend connects to the same origin, so no special configuration is needed.

---

## Admin Panel

Access at `/admin` (requires admin role).

### User Management (`/admin/users`)
- Search users by name/email
- Filter by status (active/frozen)
- Click any user to open the detail page

### User Detail (`/admin/users/:id`)
- View full wallet stats: balance, deposited, withdrawn, profit, loss
- **Credit balance** — add funds with reason (creates adjustment transaction + notification)
- **Debit balance** — remove funds with reason
- **Reset wallet** — zero out all wallet fields (balance, deposits, withdrawals, profit, loss)
- **Freeze/Unfreeze** account — frozen accounts cannot log in
- View recent trades and transactions

### Transactions (`/admin/transactions`)
- View all pending, approved, rejected transactions
- **Approve deposit** — credits the user's balance immediately
- **Reject deposit/withdrawal** — sends rejection notification to user
- **Approve withdrawal** — debits the user's balance

### Trades (`/admin/trades`)
- View all active and settled trades
- **Force Win** — settles trade as win, credits profit to user
- **Force Loss** — settles trade as loss

---

## Demo Credentials

### Admin Account
| Field | Value |
|---|---|
| Email | `admin@crypto.com` |
| Password | `admin123` |
| Role | `admin` |
| Notes | Must be manually promoted in MongoDB (see [MongoDB Configuration](#mongodb-configuration)) |

### Sample User Account
| Field | Value |
|---|---|
| Email | `user@demo.com` |
| Password | `demo1234` |
| Starting Balance | `$0.00` (admin must fund) |
| Notes | Register via the app, then admin credits balance |

> **New user balance policy:** All newly registered users start with **$0.00**. Only the admin can credit balances via the Admin Panel. Users request deposits through the wallet page, which the admin then approves.

---

## Replit Deployment

### Step 1: Set Secrets in Replit

In your Replit project, go to **Tools → Secrets** and add:

```
MONGODB_URI    = mongodb+srv://...
SESSION_SECRET = your_session_secret
JWT_SECRET     = your_jwt_secret
```

### Step 2: Workflows (already configured)

The project uses two Replit workflows:
- `artifacts/api-server: API Server` — runs `pnpm --filter @workspace/api-server run dev`
- `artifacts/crypto-app: web` — runs `pnpm --filter @workspace/crypto-app run dev`

Both are started automatically by Replit. Check the **Console** tab to confirm they're running.

### Step 3: Deploy

Click the **Deploy** button in Replit to publish. The app will be available at your `.replit.app` domain.

The reverse proxy automatically routes:
- `/api/*` → API server (port 8080)
- `/socket.io/*` → API server (Socket.IO)
- `/*` → Frontend (port 25012)

### Step 4: Promote Admin in Production

After deploying, register your admin account, then connect to your MongoDB Atlas cluster and run:

```javascript
db.users.updateOne({ email: "admin@crypto.com" }, { $set: { role: "admin" } })
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user (starts with $0 balance) |
| POST | `/api/auth/login` | Login, returns JWT token |
| GET | `/api/auth/me` | Get current user profile |
| PATCH | `/api/auth/me/password` | Change password |

### Wallet
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/wallet` | Get wallet info and balance |
| GET | `/api/wallet/transactions` | Transaction history |
| POST | `/api/wallet/deposit` | Submit deposit request |
| POST | `/api/wallet/withdraw` | Submit withdrawal request |

### Trades
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/trades` | Place a new trade |
| GET | `/api/trades/active` | Get active (open) trades |
| GET | `/api/trades/history` | Get settled trade history |
| GET | `/api/trades/stats` | Get win/loss/profit stats |

### Markets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/markets` | List all markets with current prices |
| GET | `/api/markets/:symbol/price` | Get current price for a symbol |
| GET | `/api/markets/:symbol/candles` | Get 1-minute candle history |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | Platform overview stats |
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/users/:id` | User detail with recent trades/txns |
| PATCH | `/api/admin/users/:id` | Update user status/role |
| PATCH | `/api/admin/users/:id/balance` | Credit or debit balance |
| POST | `/api/admin/users/:id/wallet/reset` | Reset all wallet fields to $0 |
| GET | `/api/admin/transactions` | All transactions |
| PATCH | `/api/admin/transactions/:id/approve` | Approve transaction |
| PATCH | `/api/admin/transactions/:id/reject` | Reject transaction |
| GET | `/api/admin/trades` | All trades |
| PATCH | `/api/admin/trades/:id/result` | Force trade result (win/loss) |

---

## Troubleshooting

### MongoDB connection fails
- Verify `MONGODB_URI` is set correctly and the cluster is accessible
- Check MongoDB Atlas IP whitelist — add `0.0.0.0/0` for Replit deployments
- Confirm the database user has `readWrite` permissions

### Socket.IO not connecting
- Ensure the API server is running (check the workflow console for `CryptoTrade API Server listening`)
- The frontend connects to the same origin — no explicit URL configuration needed
- In production, verify the `/socket.io` path is routed through the reverse proxy

### Candlestick chart not showing
- Wait 2–3 minutes after first startup for candles to accumulate in MongoDB
- Check the browser console for errors
- Verify `/api/markets/:symbol/candles` returns data

### Admin login not working
- The admin user must have `role: "admin"` in MongoDB — registration always creates `role: "user"`
- Run the MongoDB update command from the [MongoDB Configuration](#mongodb-configuration) section

### Build/typecheck errors
```bash
# Rebuild shared libs first
pnpm run typecheck:libs

# Then full check
pnpm run typecheck
```

### Port conflicts (local dev)
- API server: port 8080 (`artifacts/api-server`)
- Frontend: port 25012 (`artifacts/crypto-app`)
- These are set via `PORT` environment variable in Replit workflows

### New user has $10,000 balance (old accounts)
- The default balance was changed to $0. Existing users registered before this change retain their previous balance.
- Admin can reset any user's wallet via **Admin Panel → Users → [User] → Reset Wallet**.

---

## License

MIT — for educational and demo trading purposes only. Not intended for real financial trading.
