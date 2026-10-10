# ⚡ ClientFinder – Verified Micro-Acquisition & Codebase Exchange

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WebSocket](https://img.shields.io/badge/RealTime-WebSocket-purple.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Database](https://img.shields.io/badge/Database-SQLite%20(WAL)-orange.svg)](https://www.sqlite.org)

> **ClientFinder** is a full-stack, production-ready micro-acquisition marketplace where developers monetize completed SaaS applications, developer tools, and turnkey templates. Features automated AI codebase audits, real-time WebSocket negotiation chat, Escrow protection, and live developer API telemetry.

---

## 🌟 Key Features

### 1. 🤖 Automated AI Codebase Health & Commercial Valuation Audit
- **Telemetry & Repository Inspection**: Scans repository metadata, architecture depth, dependency trees, and commit activity.
- **Grading & Health Score**: Computes an algorithmic health rating (e.g. `95/100, A+ Production Grade`) based on modularity, security posture, and documentation completeness.
- **Market Valuation Estimation**: Projects an estimated commercial resale and licensing valuation compared against the asking price.

### 2. 💬 Real-Time 1-on-1 WebSocket Negotiation Chat
- **Instant Messaging Engine**: Built on native WebSockets (`/ws`) for zero-latency communication.
- **Deal Coordination**: In-app chat drawer allows buyers and sellers to discuss code transfers, negotiate pricing, and coordinate repository access.
- **Event-Driven Push Alerts**: Real-time notifications for incoming messages and purchase order closures.

### 3. 🔒 Trust Escrow Checkout & Order Vault
- **Protected Transactions**: Funds are held safely in escrow upon checkout.
- **Multi-Method Support**: Supports simulation for Instant UPI / NetBanking, Stripe-protected Credit/Debit cards, and Corporate Wire Transfers.
- **Automated Handover Flow**: Triggers automatic notification events and delivery workflows upon payment confirmation.

### 4. ⭐ Verified Buyer Reviews & Rating Engine
- Verified post-purchase reviews and 1-to-5 star ratings.
- Aggregated average ratings and review count badges displayed across marketplace listings.

### 5. 📡 Global Real-Time Developer Radar
- Proxies live public APIs with a 10-minute cache:
  - **GitHub Search API**: Real-time trending and updated repositories.
  - **DEV.to API**: Published developer tutorials, articles, and product launches.
  - **Hacker News (Algolia)**: Live "Show HN" submissions.

### 6. 🛡️ Enterprise-Grade Security
- Dual authentication pipeline: HTTP-only cookies + `Authorization: Bearer <token>` fallback.
- **Password Hashing**: `bcryptjs` with 10 salt rounds.
- **CSRF & Header Defence**: Custom `X-Requested-With` header verification on mutating routes.
- **Strict Input Validation**: Runtime schema parsing and sanitization with `Zod`.
- **SQL Injection Prevention**: Parameterized queries via `better-sqlite3` in WAL mode.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Vanilla JS (ESNext, Component Routing), Modern Glassmorphic CSS, Responsive Grid |
| **Backend** | Node.js (v22 LTS), Express.js, WebSockets (`ws`) |
| **Database** | SQLite (`better-sqlite3`) with WAL journal mode and foreign key constraints |
| **Authentication** | JWT (`jsonwebtoken`), HTTP-only cookies + LocalStorage Bearer Token |
| **Validation** | Zod v3 |
| **External APIs** | GitHub REST API, DEV.to API, Algolia Hacker News API |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) `>= 22.0.0`
- [npm](https://www.npmjs.com/) `>= 10.0.0`

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/clientfinder.git
cd clientfinder
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the project root:
```bash
cp .env.example .env
```
Ensure `.env` contains:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
# Optional: Raises GitHub API rate limit from 60/hr to 5,000/hr
GITHUB_TOKEN=
```

### 4. Start the application
```bash
npm start
```
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📁 Project Structure

```
clientfinder/
├── .env.example          # Sample environment configuration
├── data.db               # SQLite database (auto-generated with WAL)
├── package.json          # Dependencies and scripts
├── server.js             # Express API, SQLite queries, WebSockets & AI audit engine
├── public/               # Static assets served by Express
│   ├── index.html        # Single-page application entry point & modals
│   ├── style.css         # Custom modern design system & glassmorphism theme
│   └── app.js            # Client-side routing, WebSocket handler & UI logic
└── README.md             # Project documentation
```

---

## 🔌 API Reference

### Authentication
- `POST /api/auth/register` - Create a new buyer or seller account
- `POST /api/auth/login` - Authenticate and obtain JWT
- `POST /api/auth/logout` - Clear authentication session
- `GET /api/me` - Retrieve current authenticated user profile

### Marketplace & Projects
- `GET /api/projects` - Filter and search active listings
- `GET /api/projects/:id` - Fetch project details, seller info, and reviews
- `POST /api/projects` - Create a new codebase listing *(Seller only)*
- `PUT /api/projects/:id` - Update existing listing *(Author only)*
- `DELETE /api/projects/:id` - Remove listing *(Author only)*
- `GET /api/my/projects` - Retrieve user's published listings *(Seller only)*

### AI Intelligence & Telemetry
- `GET /api/projects/:id/ai-inspect` - Run AI codebase health and commercial valuation analysis

### Real-Time Chat & Messages
- `WS /ws` - WebSocket connection endpoint for real-time messaging
- `GET /api/chats` - List active conversations
- `GET /api/messages/:contactId` - Retrieve chat history with a contact
- `POST /api/messages/:contactId` - Send a direct message

### Escrow & Reviews
- `POST /api/projects/:id/buy` - Place project funds into Escrow vault *(Buyer only)*
- `GET /api/my/orders` - View purchase history and deliverables
- `POST /api/projects/:id/reviews` - Submit review and rating *(Buyer only)*

---

## 🚢 Production Deployment

ClientFinder can be deployed to any Node.js hosting platform (Railway, Render, Fly.io, or VPS):

1. Set environment variables on your host:
   - `NODE_ENV=production`
   - `JWT_SECRET=<secure_random_key>`
   - `PORT=3000` (or platform default)
   - `DB_PATH=/data/data.db` (point to a persistent mount)
2. Build command: `npm install`
3. Start command: `npm start`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
