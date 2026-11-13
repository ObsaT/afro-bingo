require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const BingoGameEngine = require('./gameEngine');
const { CARTELAS } = require('./cartelas');
const { setupTelegramBot } = require('./bot');
const AdminService = require('./adminService');
const BankService = require('./bankService');
const voiceService = require('./voiceService');

const app = express();
const server = http.createServer(app);

// Socket.io configuration with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const MINI_APP_URL = process.env.MINI_APP_URL || `http://localhost:${PORT}`;

// Initialize Game Engine & Admin & Bank Services
const gameEngine = new BingoGameEngine(io);
const adminService = new AdminService(gameEngine);
const bankService = new BankService(adminService);

// Telegram Bot initialization
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const { bot, notifyAgentOnDeposit } = setupTelegramBot(BOT_TOKEN, MINI_APP_URL, adminService, bankService, io, gameEngine);

// --- REST Endpoints ---

// User Profile / Auth
app.post('/api/auth/init', (req, res) => {
  const { user, referralCode } = req.body;
  const userData = user || {
    id: 'demo_' + Math.floor(Math.random() * 9000 + 1000),
    first_name: 'Afro_Player',
    username: 'afro_bingo_user',
  };
  const account = gameEngine.getOrCreateUser(userData, referralCode);
  res.json({ success: true, user: account });
});

// Get User Profile
app.get('/api/profile/:userId', (req, res) => {
  const account = gameEngine.users.get(req.params.userId);
  if (!account) return res.status(404).json({ error: 'User not found' });
  res.json(account);
});

// Wallet Deposit (Instant simulation or payment webhook)
app.post('/api/wallet/deposit', (req, res) => {
  const { userId, amount, provider } = req.body; // provider: 'telebirr' | 'cbe' | 'test'
  const user = gameEngine.users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const num = Math.max(10, parseInt(amount) || 100);
  user.mainWallet += num;

  res.json({
    success: true,
    message: `Successfully deposited ${num} ETB via ${provider || 'Telebirr'}!`,
    mainWallet: user.mainWallet,
    playWallet: user.playWallet,
  });
});

// Transfer between Main Wallet and Play Wallet
app.post('/api/wallet/transfer', (req, res) => {
  const { userId, amount, direction } = req.body; // direction: 'main_to_play' | 'play_to_main'
  const user = gameEngine.users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const num = parseInt(amount);
  if (!num || num <= 0) return res.status(400).json({ error: 'Invalid amount' });

  if (direction === 'main_to_play') {
    if (user.mainWallet < num) return res.status(400).json({ error: 'Insufficient Main Wallet balance' });
    user.mainWallet -= num;
    user.playWallet += num;
  } else {
    if (user.playWallet < num) return res.status(400).json({ error: 'Insufficient Play Wallet balance' });
    user.playWallet -= num;
    user.mainWallet += num;
  }

  res.json({
    success: true,
    mainWallet: user.mainWallet,
    playWallet: user.playWallet,
  });
});

// Leaderboard / Scores
app.get('/api/scores', (req, res) => {
  res.json({ leaderboard: gameEngine.leaderboard });
});

// Recent Game History
app.get('/api/history', (req, res) => {
  res.json({ history: gameEngine.history });
});

// User Withdrawal Request (Melbet style with Telegram dispatch & Agent attribution & Company Cut)
app.post('/api/wallet/withdraw', (req, res) => {
  const { userId, amount, provider, accountNumber, fullName, bankId } = req.body;
  const user = gameEngine.users.get(userId) || { id: userId, username: 'Player_' + userId, mainWallet: 1000 };
  if (!user) return res.status(404).json({ error: 'User not found' });

  const num = parseInt(amount);
  if (!num || num <= 0) return res.status(400).json({ error: 'Invalid withdrawal amount' });

  const bank = bankService.banks.find((b) => b.id === bankId || b.name === provider) || bankService.banks[0];
  const min = bank.minWithdrawal || 50;
  const max = bank.maxWithdrawal || 50000;

  if (num < min) {
    return res.status(400).json({ error: `Minimum withdrawal amount is ${min} ETB` });
  }
  if (num > max) {
    return res.status(400).json({ error: `Maximum withdrawal amount is ${max} ETB` });
  }
  if (user.mainWallet < num) {
    return res.status(400).json({ error: 'Insufficient Main Wallet balance' });
  }

  const cleanAcc = (accountNumber || '').trim();
  if (!cleanAcc) {
    return res.status(400).json({ error: 'Receiving phone or account number is required' });
  }

  const cleanName = (fullName || '').trim();
  if (!cleanName || cleanName.split(/\s+/).length < 2) {
    return res.status(400).json({ error: 'Full recipient name (at least 2 words) is required' });
  }

  // Deduct/Reserve gross amount from user's main wallet
  user.mainWallet -= num;
  gameEngine.saveUsers();

  // Calculate Company Cut Down and Net Payable to Player
  const cutPercent = adminService.withdrawalCutPercent || 10;
  const cutAmount = Math.round(num * (cutPercent / 100));
  const netPayout = num - cutAmount;

  const agentTelegram = (bank.withdrawalAgentTelegram || bank.agentTelegram || 'bole_afro_agent').replace('@', '');
  const targetAgent = adminService.agents.find(
    (a) => a.telegramUsername?.toLowerCase() === agentTelegram.toLowerCase()
  ) || adminService.agents[0];

  const refCode = `W-${Math.floor(10000 + Math.random() * 90000)}`;

  const tx = {
    id: 'tx_w_' + Date.now(),
    userId: user.id,
    username: user.username,
    fullName: cleanName,
    type: 'withdrawal',
    amount: num, // Gross requested amount
    cutPercent, // Company cut %
    cutAmount, // Company cut amount
    netPayout, // Net amount to be paid to player
    provider: bank.name || provider || 'Telebirr Fast',
    bankId: bank.id,
    accountNumber: cleanAcc,
    referenceCode: refCode,
    status: 'pending',
    agentId: targetAgent ? targetAgent.id : null,
    agentName: targetAgent ? targetAgent.name : null,
    agentTelegram,
    createdAt: new Date().toLocaleTimeString(),
    processedAt: null,
  };

  adminService.addTransaction(tx);

  // Real-time broadcasts
  io.emit('transactions_updated');
  io.emit('agent_dashboard_updated', { agentId: targetAgent?.id });
  io.emit('new_withdrawal_request', { tx });
  io.to(`user_${user.id}`).emit('wallet_updated', {
    userId: user.id,
    mainWallet: user.mainWallet,
    playWallet: user.playWallet,
  });

  const telegramMsg = `💸 *አዲስ የቢንጎ ገንዘብ ማውጣት ጥያቄ (New Bingo Withdrawal)*
━━━━━━━━━━━━━━━━━━━━
👤 *የተጠቃሚ መለያ (Player ID):* \`${user.id}\`
🏷️ *የተጠቃሚ ስም:* ${cleanName} (@${user.username})
💰 *የተጠየቀው መጠን (Gross Amount):* *${num} ETB*
✂️ *የድርጅት ቅናሽ (Company Cut ${cutPercent}%):* *-${cutAmount} ETB*
💵 *ለተጫዋቹ የሚላከው (Net Payable):* *${netPayout} ETB*
🏦 *የክፍያ ዘዴ (Method):* ${bank.name}
📱 *የተቀባይ ስልክ/አካውንት (Account):* \`${cleanAcc}\`
🔖 *የማጣቀሻ ኮድ (Ref):* \`${refCode}\`
━━━━━━━━━━━━━━━━━━━━
እባክዎ የተጣራውን *${netPayout} ETB* ልከው በCashier / Agent Portal ያጽድቁልኝ! አመሰግናለሁ 🙏`;

  const telegramUrl = `https://t.me/${agentTelegram}?text=${encodeURIComponent(telegramMsg)}`;

  res.json({
    success: true,
    message: `Withdrawal request for ${num} ETB submitted (Net payout: ${netPayout} ETB after ${cutAmount} ETB company cut)! Awaiting cashier approval.`,
    grossAmount: num,
    cutPercent,
    cutAmount,
    netPayout,
    mainWallet: user.mainWallet,
    playWallet: user.playWallet,
    playerId: user.id,
    telegramUrl,
    transaction: tx,
  });
});

// ================= ADMIN API ROUTES =================

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  const result = adminService.login(pin);
  if (result.success) {
    res.json(result);
  } else {
    res.status(401).json(result);
  }
});

// Middleware for Admin protected routes
const requireAdmin = (req, res, next) => adminService.verifyAuth(req, res, next);

// Admin Stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  res.json(adminService.getDashboardStats());
});

// Payments List
app.get('/api/admin/payments', requireAdmin, (req, res) => {
  const { status, type } = req.query;
  res.json({ payments: adminService.getPayments({ status, type }) });
});

// Approve Payment
app.post('/api/admin/payments/:id/approve', requireAdmin, (req, res) => {
  const result = adminService.approvePayment(req.params.id);
  if (result.success && result.transaction) {
    const user = gameEngine.users.get(result.transaction.userId);
    if (user) {
      gameEngine.saveUsers();
      io.to(`user_${user.id}`).emit('wallet_updated', {
        userId: user.id,
        mainWallet: user.mainWallet,
        playWallet: user.playWallet,
        message: `✅ ተቀማጭዎ ${result.transaction.amount} ETB በአድሚን ጸድቋል!`,
      });
      io.emit('wallet_updated', {
        userId: user.id,
        mainWallet: user.mainWallet,
        playWallet: user.playWallet,
      });
    }
    io.emit('transactions_updated');
  }
  res.json(result);
});

// Reject Payment
app.post('/api/admin/payments/:id/reject', requireAdmin, (req, res) => {
  const { reason } = req.body;
  const result = adminService.rejectPayment(req.params.id, reason);
  res.json(result);
});

// Manual Balance Adjustment
app.post('/api/admin/payments/adjust', requireAdmin, (req, res) => {
  const { userId, amount, walletType, note } = req.body;
  const result = adminService.manualBalanceAdjust(userId, amount, walletType, note);
  if (result.success && result.user) {
    gameEngine.saveUsers();
    io.to(`user_${result.user.id}`).emit('wallet_updated', {
      userId: result.user.id,
      mainWallet: result.user.mainWallet,
      playWallet: result.user.playWallet,
      message: `🔔 የሂሳብ ማስተካከያ ተደርጓል: ${amount > 0 ? '+' : ''}${amount} ETB (${note || ''})`,
    });
    io.emit('wallet_updated', {
      userId: result.user.id,
      mainWallet: result.user.mainWallet,
      playWallet: result.user.playWallet,
    });
    io.emit('transactions_updated');
  }
  res.json(result);
});

// Players List
app.get('/api/admin/players', requireAdmin, (req, res) => {
  const { search } = req.query;
  res.json({ players: adminService.getPlayers(search) });
});

// Update Player Status (active, suspended, banned)
app.post('/api/admin/players/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  const result = adminService.updatePlayerStatus(req.params.id, status);
  res.json(result);
});

// Agents List
app.get('/api/admin/agents', requireAdmin, (req, res) => {
  res.json({ agents: adminService.getAgents() });
});

// Create Agent
app.post('/api/admin/agents/create', requireAdmin, (req, res) => {
  const result = adminService.createAgent(req.body);
  res.json(result);
});

// Top-up Agent Float
app.post('/api/admin/agents/:id/credit', requireAdmin, (req, res) => {
  const { amount } = req.body;
  const result = adminService.creditAgentFloat(req.params.id, amount);
  res.json(result);
});

// Toggle Agent Status
app.post('/api/admin/agents/:id/toggle', requireAdmin, (req, res) => {
  const result = adminService.toggleAgentStatus(req.params.id);
  res.json(result);
});

// Update Agent Details (phone, account number, bank, commission, etc.)
app.put('/api/admin/agents/:id', requireAdmin, (req, res) => {
  const result = adminService.updateAgent(req.params.id, req.body);
  res.json(result);
});

// Toggle Simulation On/Off
app.post('/api/admin/simulation', requireAdmin, (req, res) => {
  const { enabled } = req.body;
  const state = gameEngine.setSimulation(enabled);
  res.json({ success: true, enableSimulation: state });
});

// ================= BANK & PAYMENT SYSTEMS (MELBET STYLE) =================

// Public list of supported banks for player deposit screen
app.get('/api/banks/public', (req, res) => {
  res.json({ banks: bankService.getPublicBanks() });
});

// Public list of supported banks for player withdrawal screen
app.get('/api/banks/withdrawal', (req, res) => {
  res.json({ banks: bankService.getPublicWithdrawalBanks() });
});

// Admin get all banks configuration
app.get('/api/admin/banks', requireAdmin, (req, res) => {
  res.json({ banks: bankService.getAllBanks() });
});

// Admin update bank details (accountNumber, recipientName, agentTelegram, etc.)
app.put('/api/admin/banks/:id', requireAdmin, (req, res) => {
  const result = bankService.updateBank(req.params.id, req.body);
  res.json(result);
});

// Admin add new bank
app.post('/api/admin/banks', requireAdmin, (req, res) => {
  const result = bankService.addBank(req.body);
  res.json(result);
});

// Admin toggle bank enabled/disabled
app.post('/api/admin/banks/:id/toggle', requireAdmin, (req, res) => {
  const result = bankService.toggleBank(req.params.id);
  res.json(result);
});

// Player confirms deposit (Melbet style: copies ID & generates Telegram dispatch to Agent)
app.post('/api/wallet/deposit-request', (req, res) => {
  const { userId, amount, bankId, playerPhone, receiptRef, receiptImage } = req.body;
  const user = gameEngine.users.get(userId) || { id: userId, username: 'Player_' + userId };
  const bank = bankService.banks.find((b) => b.id === bankId) || bankService.banks[0];

  const num = parseInt(amount);
  if (!num || isNaN(num) || num <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount' });
  }
  if (num < (bank.minAmount || 25)) {
    return res.status(400).json({ error: `Minimum deposit amount is ${bank.minAmount || 25} ETB` });
  }
  if (num > (bank.maxAmount || 50000)) {
    return res.status(400).json({ error: `Maximum deposit amount is ${(bank.maxAmount || 50000).toLocaleString()} ETB` });
  }

  const cleanPhone = (playerPhone || '').trim();
  if (!cleanPhone) {
    return res.status(400).json({ error: 'Sender phone or account number is required' });
  }

  const refCode = (receiptRef || '').trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`;

  // Find assigned agent for this bank
  const agent =
    (adminService.agents &&
      adminService.agents.find(
        (a) =>
          a.telegramUsername?.toLowerCase() === bank.agentTelegram?.toLowerCase() ||
          a.id === bank.agentId
      )) ||
    adminService.agents[0];

  const agentId = agent ? agent.id : 'agent_1';
  const agentTelegram = agent ? agent.telegramUsername : (bank.agentTelegram || 'bole_afro_agent');

  const tx = {
    id: 'tx_dep_' + Date.now(),
    userId: user.id,
    username: user.username,
    type: 'deposit',
    amount: num,
    provider: bank.name,
    accountNumber: cleanPhone,
    referenceCode: refCode,
    receiptImage: receiptImage || null,
    bankId: bank.id,
    bankName: bank.name,
    recipientAccount: bank.accountNumber,
    recipientName: bank.recipientName,
    agentId,
    agentTelegram,
    agentName: agent ? agent.name : 'Official Agent',
    status: 'pending',
    createdAt: new Date().toLocaleTimeString(),
    processedAt: null,
  };

  adminService.addTransaction(tx);

  // 1. Instantly notify Agent Portal via real-time WebSocket
  io.emit('new_deposit_request', {
    tx,
    agentId,
    agentTelegram,
    alert: `🔔 አዲስ ተቀማጭ ጥያቄ፡ ${num} ETB ከ ${cleanPhone} (${bank.name})`,
  });
  io.emit('transactions_updated');

  // 2. Instantly notify Agent via Telegram bot (if agent interacted with bot)
  if (notifyAgentOnDeposit) {
    notifyAgentOnDeposit(tx);
  }

  // Prefilled message for Agent Telegram chat
  const telegramMessage = `🎰 *አዲስ የቢንጎ ተቀማጭ ጥያቄ (New Bingo Deposit)*
━━━━━━━━━━━━━━━━━━━━━
👤 *የተጠቃሚ መለያ (Player ID):* \`${user.id}\`
🏷️ *Username:* @${user.username || 'AfroPlayer'}
💰 *የገንዘብ መጠን (Amount):* *${num} ETB*
🏦 *የባንክ ዘዴ (Method):* ${bank.name}
📱 *የተላከበት ስልክ (Sender):* \`${cleanPhone}\`
🔢 *የትራንዛክሽን ኮድ (Ref):* \`${refCode}\`
━━━━━━━━━━━━━━━━━━━━━
እባክዎ ሂሳብዎን ፈትሸው በAgent Portal ቶሎ ያስገቡልኝ! አመሰግናለሁ 🙏`;

  const telegramUrl = `https://t.me/${agentTelegram}?text=${encodeURIComponent(telegramMessage)}`;

  res.json({
    success: true,
    message: `Deposit request created! Money will be credited once Agent approves.`,
    transaction: tx,
    playerId: user.id,
    telegramUrl,
    agentTelegram,
  });
});

// ================= PUBLIC AGENT & DEPOSIT ROUTES =================

// Public active agents list for players
app.get('/api/agents/public', (req, res) => {
  res.json({ agents: adminService.getPublicAgents() });
});

// Player deposits money to Agent
app.post('/api/wallet/deposit-via-agent', (req, res) => {
  const result = adminService.playerDepositViaAgent(req.body);
  res.json(result);
});

// ================= AGENT PORTAL ROUTES =================

// Agent Login (Phone + PIN)
app.post('/api/agent/login', (req, res) => {
  const { phone, pin } = req.body;
  const result = adminService.agentLogin(phone, pin);
  if (result.success) {
    res.json(result);
  } else {
    res.status(401).json(result);
  }
});

// Agent Dashboard (Float, earnings, pending deposits)
app.get('/api/agent/:id/dashboard', (req, res) => {
  const result = adminService.getAgentDashboard(req.params.id);
  res.json(result);
});

// Agent Verifies and Tops up Player Deposit Request
app.post('/api/agent/:id/verify-deposit', (req, res) => {
  const { txId } = req.body;
  const result = adminService.agentVerifyDeposit(req.params.id, txId);
  if (result.success) {
    gameEngine.saveUsers();
    // Notify player in real-time
    io.emit('wallet_updated', {
      userId: result.userId,
      mainWallet: result.playerMainWallet,
      message: `✅ ተቀማጭዎ ${result.transaction.amount} ETB በወኪል ${req.params.id} ጸድቋል!`,
    });
    io.to(`user_${result.userId}`).emit('wallet_updated', {
      userId: result.userId,
      mainWallet: result.playerMainWallet,
      message: `✅ ተቀማጭዎ ${result.transaction.amount} ETB በወኪል ${req.params.id} ጸድቋል!`,
    });
    io.emit('agent_dashboard_updated', { agentId: req.params.id });
    io.emit('transactions_updated');
  }
  res.json(result);
});

// Agent Rejects Player Deposit Request
app.post('/api/agent/:id/reject-deposit', (req, res) => {
  const { txId, reason } = req.body;
  const result = adminService.agentRejectDeposit(req.params.id, txId, reason);
  if (result.success) {
    io.emit('agent_dashboard_updated', { agentId: req.params.id });
    io.emit('transactions_updated');
  }
  res.json(result);
});

// Agent Directly Tops up Player (Cash on Telegram)
app.post('/api/agent/:id/topup-direct', (req, res) => {
  const { playerQuery, amount, note } = req.body;
  const result = adminService.agentTopupDirect(req.params.id, { playerQuery, amount, note });
  if (result.success) {
    gameEngine.saveUsers();
    // Notify player in real-time
    io.emit('wallet_updated', {
      userId: result.transaction.userId,
      mainWallet: result.playerMainWallet,
      message: `✅ ${result.transaction.amount} ETB በወኪል ተሞልቶልዎታል!`,
    });
    io.to(`user_${result.transaction.userId}`).emit('wallet_updated', {
      userId: result.transaction.userId,
      mainWallet: result.playerMainWallet,
      message: `✅ ${result.transaction.amount} ETB በወኪል ተሞልቶልዎታል!`,
    });
    io.emit('agent_dashboard_updated', { agentId: req.params.id });
    io.emit('transactions_updated');
  }
  res.json(result);
});

// Agent Approves / Marks Paid a Player Withdrawal Request
app.post('/api/agent/:id/approve-withdrawal', (req, res) => {
  const { txId, transactionFee, notes } = req.body;
  const result = adminService.agentApproveWithdrawal(req.params.id, txId, { transactionFee, notes });
  if (result.success) {
    gameEngine.saveUsers();
    // Real-time notifications
    io.to(`user_${result.userId}`).emit('wallet_updated', {
      userId: result.userId,
      message: `✅ የማውጣት ጥያቄዎ ${result.payout} ETB በወኪል ተልኮልዎታል!`,
    });
    io.emit('agent_dashboard_updated', { agentId: req.params.id });
    io.emit('transactions_updated');
  }
  res.json(result);
});

// Admin Direct Approval of Withdrawal Request
app.post('/api/admin/approve-withdrawal', requireAdmin, (req, res) => {
  const { txId, transactionFee, notes } = req.body;
  const adminAgent = adminService.agents[0] || { id: 'admin', name: 'Super Admin' };
  const result = adminService.agentApproveWithdrawal(adminAgent.id, txId, { transactionFee, notes });
  if (result.success) {
    gameEngine.saveUsers();
    io.to(`user_${result.userId}`).emit('wallet_updated', {
      userId: result.userId,
      message: `✅ የማውጣት ጥያቄዎ ${result.payout} ETB ተልኮልዎታል!`,
    });
    io.emit('transactions_updated');
    io.emit('agent_dashboard_updated');
  }
  res.json(result);
});

// Agent Rejects Player Withdrawal Request (Funds refunded to player)
app.post('/api/agent/:id/reject-withdrawal', (req, res) => {
  const { txId, reason } = req.body;
  const result = adminService.agentRejectWithdrawal(req.params.id, txId, reason);
  if (result.success) {
    gameEngine.saveUsers();
    // Real-time notifications of refund
    io.to(`user_${result.userId}`).emit('wallet_updated', {
      userId: result.userId,
      mainWallet: result.playerMainWallet,
      message: `⚠️ የማውጣት ጥያቄዎ ውድቅ ተደርጓል (${result.refundedAmount} ETB ወደ ሂሳብዎ ተመልሷል)`,
    });
    io.emit('wallet_updated', {
      userId: result.userId,
      mainWallet: result.playerMainWallet,
    });
    io.emit('agent_dashboard_updated', { agentId: req.params.id });
    io.emit('transactions_updated');
  }
  res.json(result);
});

// Company Financial Assets API for Admin and Agents
app.get('/api/admin/company-assets', (req, res) => {
  res.json({
    success: true,
    assets: adminService.getCompanyAssetMetrics(),
  });
});

// Update Withdrawal Cut Rate
app.post('/api/admin/withdrawal-cut', requireAdmin, (req, res) => {
  const { cutPercent } = req.body;
  const num = parseFloat(cutPercent);
  if (isNaN(num) || num < 0 || num > 50) {
    return res.status(400).json({ error: 'Cut percent must be between 0% and 50%' });
  }
  adminService.withdrawalCutPercent = num;
  res.json({ success: true, withdrawalCutPercent: num });
});

// Get Game Settings
app.get('/api/admin/game-settings', requireAdmin, (req, res) => {
  res.json({
    stake: gameEngine.stake,
    houseCut: gameEngine.houseCut,
    countdown: gameEngine.countdown,
    enableSimulation: gameEngine.enableSimulation,
    maxCartelasPerPlayer: gameEngine.maxCartelasPerPlayer,
    totalCartelas: gameEngine.totalCartelas,
    simulatedBotCount: gameEngine.simulatedBotCount,
    voiceLanguage: gameEngine.voiceLanguage,
    voiceGender: gameEngine.voiceGender,
    bonusSettings: gameEngine.bonusSettings,
    state: gameEngine.state,
    gameId: gameEngine.gameId,
  });
});

// Update Game Settings
app.post('/api/admin/game-settings', requireAdmin, (req, res) => {
  const result = adminService.updateGameSettings(req.body);
  res.json(result);
});

// Direct Bonus Settings Endpoints
app.get('/api/admin/bonus-settings', requireAdmin, (req, res) => {
  res.json(gameEngine.bonusSettings);
});

app.post('/api/admin/bonus-settings', requireAdmin, (req, res) => {
  const success = gameEngine.saveBonusSettings(req.body);
  res.json({ success, bonusSettings: gameEngine.bonusSettings });
});

// User Referral Details
app.get('/api/user/:userId/referral', (req, res) => {
  const user = gameEngine.users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const botUsername = 'afrima_bingo_bot';
  res.json({
    userId: user.id,
    referralCode: `ref_${user.id}`,
    referralLink: `https://t.me/${botUsername}?start=ref_${user.id}`,
    referralsCount: user.referralsCount || 0,
    referralHistory: user.referralHistory || [],
    bonusSettings: gameEngine.bonusSettings,
  });
});

// Force Next Round
app.post('/api/admin/game/force-next', requireAdmin, (req, res) => {
  const result = adminService.forceNextRound();
  res.json(result);
});

// Clear Test Data (Reset transactions and round history without deleting users)
app.post('/api/admin/clear-test-data', requireAdmin, (req, res) => {
  const result = adminService.clearTestData();
  io.emit('transactions_updated');
  io.emit('agent_dashboard_updated');
  io.emit('game_state', gameEngine.getClientState());
  res.json(result);
});

// Get Cartela details
app.get('/api/cartela/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const cartela = CARTELAS[id];
  if (!cartela) return res.status(404).json({ error: 'Cartela not found' });
  res.json(cartela);
});

// Current Game State
app.get('/api/game/state', (req, res) => {
  const userId = req.query.userId;
  res.json(gameEngine.getClientState(userId));
});

// Real Human Voice Audio Caller Endpoint (Plays 100% reliably in Telegram WebApp)
app.get('/api/voice/ball/:id', async (req, res) => {
  const { id } = req.params;
  const lang = req.query.lang || gameEngine.voiceLanguage || 'am';
  const gender = req.query.gender || gameEngine.voiceGender || 'female';

  try {
    const audioPath = await voiceService.getAudioFile(id, lang, gender);
    if (!audioPath || !fs.existsSync(audioPath)) {
      return res.status(404).send('Audio not found');
    }
    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=604800, immutable',
      'Accept-Ranges': 'bytes',
    });
    res.sendFile(audioPath);
  } catch (err) {
    res.status(500).send('Voice error');
  }
});

// Prewarm voice calls in background
setTimeout(() => {
  voiceService.prewarm().catch(() => {});
}, 3000);

// --- Socket.IO Event Handlers ---
io.on('connection', (socket) => {
  let currentUserId = null;

  socket.on('join_game', (userData) => {
    const user = gameEngine.getOrCreateUser(userData || {}, userData?.referralCode);
    currentUserId = user.id;
    socket.join(`user_${user.id}`);
    socket.emit('game_init', gameEngine.getClientState(user.id));
  });

  socket.on('select_cartela', ({ cartelaId }) => {
    if (!currentUserId) return;
    const result = gameEngine.selectCartela(currentUserId, cartelaId);
    socket.emit('cartela_select_result', result);
  });

  socket.on('claim_bingo', ({ cartelaId }) => {
    if (!currentUserId) return;
    const result = gameEngine.claimBingo(currentUserId, cartelaId);
    socket.emit('claim_bingo_result', result);
  });

  socket.on('disconnect', () => {
    // Player disconnected
  });
});

// Serve frontend in production/dist
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.use((req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [Nam Afro Bingo] Server running on http://localhost:${PORT}`);
});
