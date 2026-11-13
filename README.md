# 🇪🇹 Nam Afro Bingo - Telegram Bot & Mini App (TMA)

An authentic, production-grade Ethiopian Multiplayer Bingo Game built for **Telegram Mini Apps (TMA)** and the web, faithfully recreating the popular **Afro / Dil Bingo** experience with high-fidelity UI, real-time multiplayer WebSockets, live audio ball caller, and Ethiopian payment integrations (Telebirr & CBE Birr).

---

## 📸 Features & Faithful UI Implementation

- **🎯 Exact UI Replication**:
  - **Telegram Mini App Header**: Title bar, Back, and Refresh controls.
  - **Live Countdown & Stats**: Displays Main Wallet, Play Wallet, Stake (Bet amount), and dynamic Countdown Timer.
  - **Cartela Selection Board (1–100)**: Responsive 8-column card grid showing occupied/taken cartelas (signature warm orange-red) and available cartelas (deep indigo).
  - **75-Ball Master Board**: Columns **B (1–15)**, **I (16–30)**, **N (31–45)**, **G (46–60)**, and **O (61–75)** with individual column color coding.
  - **Real-Time Ball Calling Engine**:
    - Animated glowing center ball display (`N-39`, `B-8`, etc.).
    - Recent called balls carousel.
    - Sound effects + synthesized voice announcements using Web Speech & Web Audio API.
    - Toggleable **AUTOMATIC** daubing switch.
  - **Player 5x5 Cartela & Watching Mode**:
    - Interactive 5x5 Bingo cartela with center Free Star ⭐.
    - "WATCHING ONLY" spectator mode with Amharic guidance ("የዚህ ዙር ጨዋታ ተጀምሯል። አዲስ ዙር እስኪጀምር እዚህ ይጠብቁ።").
    - Pulsing **BINGO!** button upon winning line completion.
  - **Winning Celebration Modal**:
    - 👑 Crown & confetti explosion.
    - Displays all round winners and their Cartela IDs.
    - **Winning Cartel View**: 5x5 grid with the winning pattern highlighted in bright emerald green and called numbers in orange.
    - Animated progress bar counting down to the next round.
  - **5 Bottom Tabs**:
    - `GAME`: Live multiplayer room.
    - `SCORES`: Leaderboard of top earners.
    - `HISTORY`: Round logs with Derash payouts.
    - `WALLET`: Telebirr & CBE Birr deposit, transfer between Main & Play wallets, and withdrawals.
    - `PROFILE`: Verified player profile, language selector (English / አማርኛ), and referral link.

---

## 👑 Admin & Cashier Portal

An all-in-one administrator console to manage financial flows, player accounts, agents, and live game parameters.

### How to Access
- **Web**: Open [http://localhost:4000/?admin=true](http://localhost:4000/?admin=true) or tap the **👑** icon in the TMA header or Profile tab.
- **Telegram Bot**: Send `/admin` to receive a direct Web App link.
- **Default Credentials**:
  - Admin PIN: `admin123` *(configurable via `ADMIN_PIN` in `.env`)*

### Key Capabilities
1. **🤖 Simulation Pause / Play Setting (Test Mode Control)**:
   - **Toggle Switch**: Pause or activate automated bot players with one click.
   - When **Paused (OFF)**: No simulated players join. Only real human players who connect and pick cartelas can play!
   - When **Active (ON)**: Simulates 30–50 players in rooms for testing atmosphere.

2. **💳 Payment & Cashier Management**:
   - Live queue of **Telebirr** and **CBE Birr** deposits and withdrawal requests.
   - **One-click Approve**: Instantly credits user balance (deposits) or confirms payout (withdrawals).
   - **Reject with Reason**: Automatically refunds requested funds back to user's wallet.
   - **Manual Balance Credit/Debit**: Adjust any player's Main or Play Wallet directly with an audit note.

3. **🤝 Agent System (የወኪሎች ስርዓት)**:
   - **Full Agent Details**: Admin manages agent Name, Phone Number, Bank Name, Bank Account Number, Telegram handle, Commission %, Float Balance, and Agent PIN.
   - **Edit Agent Details**: Edit phone numbers and account numbers directly from the admin panel.
   - **Deposit via Agent Workflow**:
     1. Player opens Wallet ➔ **"Deposit via Agent (በወኪል በኩል አስገባ)"**.
     2. Player views verified agents with their phone number, CBE/Telebirr account number, and one-click **"Chat on Telegram"** button (`t.me/<username>`).
     3. Player transfers money to the agent and submits their payment reference code.
     4. Deposit request arrives directly in the specific Agent's queue.

4. **🤝 Dedicated Agent Portal (የወኪሎች መግቢያ)**:
   - Accessible via [http://localhost:4000/?agent=true](http://localhost:4000/?agent=true), the Profile tab ("Agent Portal"), or the Telegram bot `/agent` command.
   - Agent logs in using their Phone Number + PIN (Default demo: `0911445566` / `1234`).
   - Agent checks their incoming deposit requests, verifies payment on their Telebirr or CBE account, and clicks **"Verify & Top Up"**.
   - The player's balance is credited immediately, the agent's float is deducted, and the agent earns their % commission on that deposit!
   - **Direct Top-Up (ለተጫዋች ቀጥታ አስገባ)**: Agent can also top up any player directly by username or ID upon receiving cash.

5. **⚙️ Live Game & House Controls**:
   - Real-time House Rake revenue tracking.
   - Adjust stake per cartela (e.g. 10, 20, 50 ETB).
   - Adjust House Rake percentage (e.g. 15%, 20%).
   - Adjust selection countdown timer.
   - **Emergency Force Next Round**: Immediately advance stalled or testing rounds.

---

## 🚀 Quick Start

### 1. Install & Build
```bash
# Install server dependencies
npm install

# Install client dependencies & build static bundle
cd client
npm install
npm run build
cd ..
```

### 2. Configure Environment (`.env`)
Create or edit `.env` in the root folder:
```env
PORT=4000
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_FROM_BOTFATHER
MINI_APP_URL=https://your-domain-or-ngrok.app
```
*(If `TELEGRAM_BOT_TOKEN` is left empty, the server automatically runs in standalone web mode on `http://localhost:4000`)*.

### 3. Run the Server
```bash
npm start
```
Open [http://localhost:4000](http://localhost:4000) in your browser.

---

## 🤖 Connecting to Telegram

1. Open Telegram and message [@BotFather](https://t.me/BotFather).
2. Create a new bot using `/newbot` and copy your API Token into `.env` as `TELEGRAM_BOT_TOKEN`.
3. To attach the Web App to your bot:
   - Send `/newapp` to `@BotFather`.
   - Choose your bot.
   - Enter title: `Nam Afro Bingo`.
   - Set description and upload icon if prompted.
   - Provide your public HTTPS Web App URL (e.g. from Cloudflare Tunnel, ngrok, or hosting provider).
   - BotFather will provide a short link like `t.me/YourBot/app`.
4. Alternatively, use `/setmenubutton` in `@BotFather` to add the "🎮 Play Afro Bingo" button directly next to the message input in Telegram.

---

## 🏗️ Architecture

```
├── client/                     # Vite + React + Tailwind CSS Mini App
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx           # TMA Header & Wallet Stats
│   │   │   ├── CartelaSelection.jsx # 1-100 Cartela selection grid
│   │   │   ├── GameView.jsx         # Master 75-Ball Board & Player Cartela
│   │   │   ├── WinningModal.jsx     # Bingo celebration & Winning Cartela view
│   │   │   ├── WalletModal.jsx      # Telebirr / CBE Birr wallet & transfers
│   │   │   ├── ScoresModal.jsx      # Leaderboard
│   │   │   ├── HistoryModal.jsx     # Game round history
│   │   │   ├── ProfileModal.jsx     # Profile & Amharic / English toggle
│   │   │   └── BottomNav.jsx        # 5 bottom navigation tabs
│   │   ├── utils/audio.js           # Web Audio synthesizer & Voice announcer
│   │   ├── App.jsx                  # State machine & Socket.io client
│   │   └── index.css                # Tailwind custom theme variables
│   └── dist/                        # Production build bundle
├── server/
│   ├── cartelas.js             # Deterministic 100 Cartelas & 75-Ball Bingo validator
│   ├── gameEngine.js           # Real-time multiplayer room & bot players
│   ├── bot.js                  # Telegram Bot commands & TMA inline buttons
│   └── server.js               # Express + Socket.IO server
├── .env                        # Environment configuration
└── package.json
```
