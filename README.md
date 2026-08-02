# 🔐 Backend Auth — JWT Authentication System

A production-grade **JWT authentication backend** built with **Node.js + Express**, featuring **secure token rotation** and **reuse detection** to protect against token theft and replay attacks.

This project is a complete, self-contained authentication API — it needs **no external database** (data is persisted to local JSON files), making it perfect for learning, prototyping, or as the auth layer of a larger app.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📝 **User Registration** | Create an account with a securely hashed password (bcrypt) |
| 🔑 **Login / Logout** | Authenticate and receive an access + refresh token pair |
| 🛡️ **JWT Access Tokens** | Short-lived (15 min) tokens sent via `Authorization: Bearer` header |
| 🔁 **Refresh Tokens** | Long-lived (7 days) tokens stored in an `httpOnly` cookie |
| 🔄 **Token Rotation** | Every refresh invalidates the old token and issues a new pair |
| 🚨 **Reuse Detection** | Replaying a rotated token revokes the **entire token family** (theft protection) |
| 🚪 **Logout (all devices)** | Revoke a single token or every refresh token for a user |
| 👤 **Protected Routes** | Middleware-protected `/me` endpoint |
| 🗄️ **Zero External DB** | Simple JSON file-based data store (swap in MongoDB/Postgres later) |

---

## 🛠️ Tech Stack

- **Node.js** — JavaScript runtime
- **Express** (v5) — web framework
- **jsonwebtoken** — JWT signing & verification
- **bcryptjs** — password hashing
- **cookie-parser** — refresh token cookie parsing
- **dotenv** — environment configuration
- **uuid** — unique token IDs (jti) & user IDs

---

## 📁 Project Structure

```
backend-auth/
└── backend/
    ├── server.js                      # Express app entry (port 8000)
    ├── .env.example                   # Copy to .env and fill in secrets
    ├── .env                           # ⚠️ Your real secrets (never commit)
    ├── package.json
    ├── scripts/
    │   └── test-auth.ps1              # 12-test suite for all auth flows
    └── src/
        ├── config/
        │   └── db.js                  # JSON file-based data store
        ├── models/
        │   ├── userModel.js           # User CRUD + persistence
        │   └── refreshTokenModel.js   # Refresh tokens with family tracking
        ├── services/
        │   └── tokenService.js        # Token generation, rotation, reuse detection
        ├── controllers/
        │   └── authController.js      # register / login / refresh / logout / me
        ├── middleware/
        │   ├── authMiddleware.js      # JWT verification (protect)
        │   └── errorHandler.js        # Centralized error handling
        ├── routes/
        │   └── authRoutes.js          # /api/auth/* routes
        └── utils/
            └── AppError.js            # Custom error class
```

---

## 🚀 Getting Started

### 1. Clone & install

```bash
git clone https://github.com/MilanEkanna/backend-auth.git
cd backend-auth/backend
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then open `.env` and replace the secret values with your own strong, random strings.

### 3. Start the server

```bash
npm start
```

You should see:

```
Server is listening on http://localhost:8000
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` folder. All variables are optional except the two secrets.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Port the server listens on |
| `ACCESS_TOKEN_SECRET` | — | 🔴 **Required.** Secret used to sign access tokens |
| `REFRESH_TOKEN_SECRET` | — | 🔴 **Required.** Secret used to sign refresh tokens |
| `ACCESS_TOKEN_EXPIRY` | `15m` | Access token lifetime (e.g. `15m`, `1h`, `1d`) |
| `REFRESH_TOKEN_EXPIRY` | `7d` | Refresh token lifetime (e.g. `7d`, `30d`) |
| `REFRESH_TOKEN_COOKIE_NAME` | `refreshToken` | Name of the httpOnly cookie |
| `NODE_ENV` | `development` | Set to `production` to force secure cookies |
| `COOKIE_SECURE` | `false` | Set `true` to only send cookies over HTTPS |

> 💡 Generate strong secrets with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

---

## 📡 API Endpoints

Base URL: `http://localhost:8000`

### Health check

```
GET /api/health
```

### 1. Register a new user

```
POST /api/auth/register
```

**Request body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e8ffc35b-...",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2026-08-02T14:47:07.511Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 2. Login

```
POST /api/auth/login
```

**Request body:**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

Returns the same shape as register — a `user` object plus `accessToken` and `refreshToken`. The refresh token is **also** set as an `httpOnly` cookie.

### 3. Refresh tokens (rotation)

```
POST /api/auth/refresh
```

Send the refresh token in the body (or rely on the httpOnly cookie):

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Returns a new access token AND a new refresh token.** The old refresh token is invalidated. Reusing the old token afterwards triggers reuse detection → the whole token family is revoked.

### 4. Access protected route

```
GET /api/auth/me
```

**Header:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e8ffc35b-...",
      "email": "john@example.com",
      "name": "John Doe"
    }
  }
}
```

### 5. Logout (single device)

```
POST /api/auth/logout
```

Revokes the presented refresh token and clears the cookie.

### 6. Logout (all devices)

```
POST /api/auth/logout-all
```

Requires `Authorization: Bearer <accessToken>`. Revokes **every** refresh token belonging to the authenticated user.

---

## 🔄 How Token Rotation & Reuse Detection Work

```
Login
  │
  ├── Creates token family: F1
  ├── Issues RT-A (jti=A, family=F1)  +  Access Token
  │
  ▼
Refresh with RT-A
  │
  ├── RT-A marked as "rotated"
  ├── Issues RT-B (jti=B, family=F1)  +  new Access Token
  │
  ▼
Refresh with RT-B
  │
  ├── RT-B marked as "rotated"
  ├── Issues RT-C (jti=C, family=F1)  +  new Access Token
  │
  ▼
Attacker replays STALE token RT-A ❌
  │
  └── REUSE DETECTED
      └── Entire family F1 REVOKED
          └── RT-B, RT-C, RT-A all dead
```

### Why this matters

- **Token rotation** means a stolen refresh token is only usable once.
- **Reuse detection** means if an attacker replays an already-used token, the *legitimate* user's session is also revoked — forcing a fresh login and signalling that something is wrong.

This is the recommended approach per **OWASP** for refresh token handling.

---

## 🧪 Running the Tests

A PowerShell test script verifies all authentication flows end-to-end against a running server.

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File scripts\test-auth.ps1
```

**What it covers:**

| Test | Description |
|------|-------------|
| 1 | Register a new user |
| 2 | Duplicate email is rejected |
| 3 | Login with correct credentials |
| 4 | Login with wrong password is rejected |
| 5 | Protected `/me` route works with valid token |
| 6 | Protected `/me` route rejected without token |
| 7 | Refresh token rotation works (RT1 → RT2) |
| 8 | Rotation chain continues (RT2 → RT3) |
| 9 | Replaying stale RT1 → reuse detected, family revoked |
| 10 | RT3 now fails (same revoked family) |
| 11 | Logout with a fresh token works |
| 12 | Logged-out refresh token is rejected |

---

## 🔒 Security Notes

- Passwords are hashed with **bcrypt** (10 salt rounds) — never stored in plaintext.
- Refresh tokens are stored as **httpOnly** cookies to mitigate XSS token theft.
- Access tokens are short-lived to limit the impact of a leak.
- Refresh tokens carry a unique `jti` claim for tracking and rotation.
- Reuse detection revokes entire token families.
- Generic error messages on login (`Invalid email or password`) prevent user enumeration.
- A centralized error handler keeps the API response format consistent.

> ⚠️ **Important:** Never commit your real `.env` file. This repo ships with `.gitignore` rules that exclude `.env`, `node_modules/`, and the JSON data store from version control.

---

## 🗄️ About the Data Store

This project uses **JSON files** (`backend/src/data/users.json`, `refreshTokens.json`) for simplicity — no database setup required. The files are auto-created on first run and are ignored by git.

For production, swap the model layer for a real database (MongoDB, PostgreSQL, Redis for tokens, etc.) — the controller/service architecture makes this straightforward.

---

## 📄 License

ISC

