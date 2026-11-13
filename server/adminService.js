// Admin Service for Payments, Players, Agents, and House Management
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

class AdminService {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.adminToken = process.env.ADMIN_TOKEN || 'afro_admin_secret_token_2026';
    this.adminPin = process.env.ADMIN_PIN || 'admin123';
    this.withdrawalCutPercent = 10; // 10% default company cut on withdrawals

    this.dataDir = path.join(__dirname, 'data');
    this.txFile = path.join(this.dataDir, 'transactions.json');
    this.agentsFile = path.join(this.dataDir, 'agents.json');

    // Ensure data directory exists
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (e) {}

    // Load Transactions from disk (persistent - never lost on server restart!)
    this.transactions = [];
    try {
      if (fs.existsSync(this.txFile)) {
        this.transactions = JSON.parse(fs.readFileSync(this.txFile, 'utf8'));
      } else {
        // No fake data! Real transactions only.
        this.transactions = [];
        this.saveTransactions();
      }
    } catch (e) {
      this.transactions = [];
    }

    // Load Agents from disk
    this.agents = [];
    try {
      if (fs.existsSync(this.agentsFile)) {
        this.agents = JSON.parse(fs.readFileSync(this.agentsFile, 'utf8'));
      } else {
        this.agents = [
          {
            id: 'agent_1',
            name: 'Bole Medhanealem Agent',
            phone: '0911445566',
            bankName: 'Telebirr & CBE',
            accountNumber: '1000293847561',
            telegramUsername: 'bole_afro_agent',
            pin: '1234',
            commissionRate: 7, // 7%
            balance: 5000, // Float balance
            totalPlayersOnboarded: 0,
            totalDepositsHandled: 0,
            totalCommissionEarned: 0,
            status: 'active',
            createdAt: new Date().toISOString().split('T')[0],
          },
        ];
        this.saveAgents();
      }
    } catch (e) {
      this.agents = [];
    }
  }

  saveTransactions() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.txFile, JSON.stringify(this.transactions, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save transactions to disk:', e);
    }
  }

  saveAgents() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.agentsFile, JSON.stringify(this.agents, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save agents to disk:', e);
    }
  }

  addTransaction(tx) {
    this.transactions.unshift(tx);
    this.saveTransactions();
    return tx;
  }

  // Verify Admin Auth
  verifyAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : req.query.token;
    if (token === this.adminToken) {
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin Credentials' });
  }

  login(pin) {
    if (pin === this.adminPin) {
      return { success: true, token: this.adminToken };
    }
    return { success: false, error: 'Incorrect Admin PIN / Password' };
  }

  // Financial Asset Breakdown for Bingo Company
  getCompanyAssetMetrics() {
    const approvedDeposits = this.transactions
      .filter((t) => t.type === 'deposit' && t.status === 'approved')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const approvedWithdrawals = this.transactions.filter(
      (t) => t.type === 'withdrawal' && t.status === 'approved'
    );
    const totalApprovedWithdrawalGross = approvedWithdrawals.reduce(
      (sum, t) => sum + (Number(t.amount) || 0),
      0
    );
    const totalWithdrawalsNetPaid = approvedWithdrawals.reduce(
      (sum, t) =>
        sum +
        (t.actualPaidAmount !== undefined
          ? Number(t.actualPaidAmount)
          : t.netPayout !== undefined
          ? Number(t.netPayout)
          : Number(t.amount) - (Number(t.cutAmount) || 0)),
      0
    );
    const totalTransactionFees = approvedWithdrawals.reduce(
      (sum, t) => sum + (Number(t.transactionFee) || 0),
      0
    );
    const totalWithdrawalCuts = approvedWithdrawals.reduce(
      (sum, t) =>
        sum +
        (t.cutAmount !== undefined
          ? Number(t.cutAmount)
          : Math.round(
              Number(t.amount) *
                ((t.cutPercent !== undefined ? t.cutPercent : this.withdrawalCutPercent) / 100)
            )),
      0
    );

    const pendingWithdrawals = this.transactions.filter(
      (t) => t.type === 'withdrawal' && t.status === 'pending'
    );
    const pendingWithdrawalGross = pendingWithdrawals.reduce(
      (sum, t) => sum + (Number(t.amount) || 0),
      0
    );
    const pendingWithdrawalNetPayable = pendingWithdrawals.reduce(
      (sum, t) =>
        sum +
        (t.netPayout !== undefined
          ? Number(t.netPayout)
          : Number(t.amount) - (Number(t.cutAmount) || 0)),
      0
    );

    const houseCutRate = this.gameEngine.houseCut;
    const totalGameHouseProfit = Math.floor(
      this.gameEngine.history.reduce(
        (sum, h) => sum + (h.bet * h.playersCount * houseCutRate),
        0
      ) +
        (this.gameEngine.takenCartelas.size * this.gameEngine.stake * houseCutRate)
    );

    const totalCompanyProfit = totalGameHouseProfit + totalWithdrawalCuts;
    // Current Remaining Money Asset for the Bingo Company
    const companyMoneyAsset = Math.max(
      0,
      approvedDeposits + totalCompanyProfit - totalWithdrawalsNetPaid
    );

    return {
      approvedDeposits,
      totalApprovedWithdrawalGross,
      totalWithdrawalsNetPaid, // Successful payouts sent
      totalWithdrawalCuts, // Company cuts earned from cashouts
      totalGameHouseProfit, // Game house rake profit
      totalCompanyProfit, // Total company revenue
      pendingWithdrawalsCount: pendingWithdrawals.length,
      pendingWithdrawalGross,
      pendingWithdrawalNetPayable,
      totalTransactionFees, // Total optional bank transfer costs recorded
      companyMoneyAsset, // How many left money asset for the bingo company!
      withdrawalCutPercent: this.withdrawalCutPercent,
    };
  }

  // Dashboard High-Level Metrics
  getDashboardStats() {
    const totalTransactions = this.transactions.length;
    const pendingTransactions = this.transactions.filter((t) => t.status === 'pending');
    const assetMetrics = this.getCompanyAssetMetrics();

    const activePlayersCount = this.gameEngine.users.size;
    const currentRoundPlayers = this.gameEngine.takenCartelas.size;
    const currentDerash = this.gameEngine.getDerash();
    const houseCutRate = this.gameEngine.houseCut;

    return {
      totalPlayers: activePlayersCount,
      currentRoundPlayers,
      currentDerash,
      stake: this.gameEngine.stake,
      houseCutRate: Math.round(houseCutRate * 100),
      gameState: this.gameEngine.state,
      gameId: this.gameEngine.gameId,
      enableSimulation: this.gameEngine.enableSimulation,
      estimatedHouseProfit: assetMetrics.totalGameHouseProfit,
      totalApprovedDeposits: assetMetrics.approvedDeposits,
      pendingWithdrawalsCount: assetMetrics.pendingWithdrawalsCount,
      pendingWithdrawalAmount: assetMetrics.pendingWithdrawalNetPayable,
      companyAssets: assetMetrics,
      totalAgents: this.agents.length,
      activeAgents: this.agents.filter((a) => a.status === 'active').length,
    };
  }

  // --- Payment Management ---
  getPayments(filter = {}) {
    let list = [...this.transactions];
    if (filter.status && filter.status !== 'all') {
      list = list.filter((t) => t.status === filter.status);
    }
    if (filter.type && filter.type !== 'all') {
      list = list.filter((t) => t.type === filter.type);
    }
    if (filter.agentId) {
      list = list.filter((t) => t.agentId === filter.agentId);
    }
    return list;
  }

  approvePayment(txId, processedBy = 'Admin') {
    const tx = this.transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, error: 'Transaction not found' };
    if (tx.status !== 'pending') return { success: false, error: 'Transaction is not pending' };

    tx.status = 'approved';
    tx.processedAt = new Date().toLocaleTimeString();
    tx.processedBy = processedBy;

    // If it was a deposit, credit user's main wallet
    if (tx.type === 'deposit') {
      const user = this.gameEngine.users.get(tx.userId);
      if (user) {
        user.mainWallet += tx.amount;
      }
    }

    this.saveTransactions();
    return { success: true, transaction: tx };
  }

  rejectPayment(txId, reason = 'Verification failed', processedBy = 'Admin') {
    const tx = this.transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, error: 'Transaction not found' };
    if (tx.status !== 'pending') return { success: false, error: 'Transaction is not pending' };

    tx.status = 'rejected';
    tx.rejectionReason = reason;
    tx.processedAt = new Date().toLocaleTimeString();
    tx.processedBy = processedBy;

    // If it was a withdrawal, refund back to user's main wallet
    if (tx.type === 'withdrawal') {
      const user = this.gameEngine.users.get(tx.userId);
      if (user) {
        user.mainWallet += tx.amount;
      }
    }

    this.saveTransactions();
    return { success: true, transaction: tx };
  }

  manualBalanceAdjust(userId, amount, walletType = 'mainWallet', note = '') {
    const user = this.gameEngine.users.get(userId);
    if (!user) return { success: false, error: 'Player not found' };

    const num = parseInt(amount);
    if (isNaN(num)) return { success: false, error: 'Invalid amount' };

    if (walletType === 'mainWallet') {
      user.mainWallet = Math.max(0, user.mainWallet + num);
    } else {
      user.playWallet = Math.max(0, user.playWallet + num);
    }

    // Record adjustment transaction
    this.addTransaction({
      id: 'tx_adj_' + Date.now(),
      userId: user.id,
      username: user.username,
      type: num >= 0 ? 'deposit' : 'withdrawal',
      amount: Math.abs(num),
      provider: 'admin_adjustment',
      accountNumber: 'SYSTEM',
      referenceCode: `ADJ-${note || 'Manual'}`,
      status: 'approved',
      createdAt: new Date().toLocaleTimeString(),
      processedAt: new Date().toLocaleTimeString(),
    });

    return { success: true, user };
  }

  // --- Players Management ---
  getPlayers(search = '') {
    const list = Array.from(this.gameEngine.users.values()).map((u) => ({
      ...u,
      status: u.status || 'active',
      isOnline: true,
    }));

    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (u) =>
        u.id.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.firstName && u.firstName.toLowerCase().includes(q))
    );
  }

  updatePlayerStatus(userId, status) {
    const user = this.gameEngine.users.get(userId);
    if (!user) return { success: false, error: 'Player not found' };
    user.status = status; // 'active' | 'suspended' | 'banned'
    return { success: true, user };
  }

  // --- Agents Management (Admin Side) ---
  getAgents() {
    return this.agents;
  }

  getPublicAgents() {
    return this.agents
      .filter((a) => a.status === 'active')
      .map((a) => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        bankName: a.bankName,
        accountNumber: a.accountNumber,
        telegramUsername: a.telegramUsername,
        commissionRate: a.commissionRate,
      }));
  }

  createAgent(agentData) {
    const newAgent = {
      id: 'agent_' + (this.agents.length + 1),
      name: agentData.name,
      phone: agentData.phone,
      bankName: agentData.bankName || 'Telebirr & CBE',
      accountNumber: agentData.accountNumber || agentData.phone,
      telegramUsername: (agentData.telegramUsername || '').replace('@', ''),
      pin: agentData.pin || '1234',
      commissionRate: parseFloat(agentData.commissionRate) || 7,
      balance: parseInt(agentData.initialFloat) || 1000,
      totalPlayersOnboarded: 0,
      totalDepositsHandled: 0,
      totalCommissionEarned: 0,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.agents.unshift(newAgent);
    this.saveAgents();
    return { success: true, agent: newAgent };
  }

  updateAgent(agentId, data) {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: 'Agent not found' };

    if (data.name) agent.name = data.name;
    if (data.phone) agent.phone = data.phone;
    if (data.bankName) agent.bankName = data.bankName;
    if (data.accountNumber) agent.accountNumber = data.accountNumber;
    if (data.telegramUsername !== undefined) agent.telegramUsername = data.telegramUsername.replace('@', '');
    if (data.pin) agent.pin = data.pin;
    if (data.commissionRate) agent.commissionRate = parseFloat(data.commissionRate);

    this.saveAgents();
    return { success: true, agent };
  }

  creditAgentFloat(agentId, amount) {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: 'Agent not found' };
    const num = parseInt(amount);
    if (isNaN(num) || num <= 0) return { success: false, error: 'Invalid amount' };
    agent.balance += num;
    this.saveAgents();
    return { success: true, agent };
  }

  toggleAgentStatus(agentId) {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: 'Agent not found' };
    agent.status = agent.status === 'active' ? 'inactive' : 'active';
    this.saveAgents();
    return { success: true, agent };
  }

  // --- AGENT PORTAL METHODS (Agent checking & crediting deposits) ---

  agentLogin(phone, pin) {
    const agent = this.agents.find((a) => a.phone === phone.trim());
    if (!agent) return { success: false, error: 'Agent phone number not registered' };
    if (agent.pin !== pin.trim()) return { success: false, error: 'Invalid Agent PIN' };
    if (agent.status !== 'active') return { success: false, error: 'Agent account is inactive or disabled' };

    const agentToken = `agent_token_${agent.id}_${Date.now()}`;
    return {
      success: true,
      token: agentToken,
      agent: {
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        bankName: agent.bankName,
        accountNumber: agent.accountNumber,
        telegramUsername: agent.telegramUsername,
        commissionRate: agent.commissionRate,
        balance: agent.balance,
        totalDepositsHandled: agent.totalDepositsHandled,
        totalCommissionEarned: agent.totalCommissionEarned,
      },
    };
  }

  getAgentDashboard(agentId) {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: 'Agent not found' };

    const pendingRequests = this.transactions.filter(
      (t) =>
        t.type === 'deposit' &&
        t.status === 'pending' &&
        (t.agentId === agentId ||
          t.agentTelegram?.toLowerCase() === agent.telegramUsername?.toLowerCase() ||
          !t.agentId)
    );

    const pendingWithdrawals = this.transactions.filter(
      (t) =>
        t.type === 'withdrawal' &&
        t.status === 'pending' &&
        (t.agentId === agentId ||
          t.agentTelegram?.toLowerCase() === agent.telegramUsername?.toLowerCase() ||
          !t.agentId)
    );

    const allWithdrawals = this.transactions
      .filter(
        (t) =>
          t.type === 'withdrawal' &&
          (t.agentId === agentId ||
            t.agentTelegram?.toLowerCase() === agent.telegramUsername?.toLowerCase() ||
            !t.agentId)
      )
      .slice(0, 50);

    const recentProcessed = this.transactions
      .filter(
        (t) =>
          (t.agentId === agentId ||
            t.agentTelegram?.toLowerCase() === agent.telegramUsername?.toLowerCase()) &&
          t.status !== 'pending'
      )
      .slice(0, 30);

    const companyAssets = this.getCompanyAssetMetrics();

    return {
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        bankName: agent.bankName,
        accountNumber: agent.accountNumber,
        telegramUsername: agent.telegramUsername,
        commissionRate: agent.commissionRate,
        balance: agent.balance,
        totalDepositsHandled: agent.totalDepositsHandled,
        totalCommissionEarned: agent.totalCommissionEarned,
      },
      pendingRequests,
      pendingWithdrawals,
      allWithdrawals,
      recentProcessed,
      companyAssets,
    };
  }

  // Agent Approves / Marks Paid a Player's Withdrawal Request (with optional transaction fee)
  agentApproveWithdrawal(agentId, txId, options = {}) {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: 'Agent not found' };

    const tx = this.transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, error: 'Withdrawal request not found' };
    if (tx.type !== 'withdrawal') return { success: false, error: 'Transaction is not a withdrawal' };
    if (tx.status !== 'pending') return { success: false, error: `Withdrawal request is already ${tx.status}` };

    const txFee = Math.max(0, Number(options.transactionFee) || 0);
    const standardNetPayout = tx.netPayout !== undefined ? Number(tx.netPayout) : Number(tx.amount) - (Number(tx.cutAmount) || 0);
    const actualPayout = Math.max(0, standardNetPayout - txFee);

    tx.status = 'approved';
    tx.agentId = agent.id;
    tx.agentName = agent.name;
    tx.processedBy = `Agent: ${agent.name}`;
    tx.processedAt = new Date().toLocaleTimeString();
    tx.transactionFee = txFee;
    tx.actualPaidAmount = actualPayout;
    if (options.notes) tx.agentNotes = options.notes;

    this.saveTransactions();

    const feeMsg = txFee > 0 ? ` (የባንክ ወጪ ${txFee} ETB ተቀናሽ ተደርጓል)` : '';
    return {
      success: true,
      transaction: tx,
      payout: actualPayout,
      transactionFee: txFee,
      standardNetPayout,
      userId: tx.userId,
      message: `✅ የማውጣት ጥያቄ ${actualPayout} ETB${feeMsg} በወኪል ${agent.name} ጸድቋል!`,
    };
  }

  // Agent Rejects Player's Withdrawal Request and Refunds Balance
  agentRejectWithdrawal(agentId, txId, reason = 'Payment details invalid') {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: 'Agent not found' };

    const tx = this.transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, error: 'Withdrawal request not found' };
    if (tx.type !== 'withdrawal') return { success: false, error: 'Transaction is not a withdrawal' };
    if (tx.status !== 'pending') return { success: false, error: `Withdrawal request is already ${tx.status}` };

    tx.status = 'rejected';
    tx.rejectionReason = reason;
    tx.agentId = agent.id;
    tx.agentName = agent.name;
    tx.processedBy = `Agent: ${agent.name}`;
    tx.processedAt = new Date().toLocaleTimeString();

    // Refund player's reserved balance back to mainWallet
    const user = this.gameEngine.users.get(tx.userId);
    if (user) {
      user.mainWallet = (user.mainWallet || 0) + tx.amount;
      this.gameEngine.saveUsers();
    }

    this.saveTransactions();

    return {
      success: true,
      transaction: tx,
      userId: tx.userId,
      refundedAmount: tx.amount,
      playerMainWallet: user ? user.mainWallet : 0,
      message: `የማውጣት ጥያቄ ውድቅ ተደርጓል (${tx.amount} ETB ወደ ተጫዋች ሂሳብ ተመልሷል)`,
    };
  }

  // Agent verifies and approves player's deposit request
  agentVerifyDeposit(agentId, txId) {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: 'Agent not found' };

    const tx = this.transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, error: 'Deposit request not found' };
    
    // Allow if assigned to agent, matching username, or unassigned
    if (
      tx.agentId &&
      tx.agentId !== agentId &&
      tx.agentTelegram?.toLowerCase() !== agent.telegramUsername?.toLowerCase()
    ) {
      return { success: false, error: 'Request is not assigned to this agent' };
    }
    if (tx.status !== 'pending') return { success: false, error: 'Request is already processed' };

    // Check agent float balance
    if (agent.balance < tx.amount) {
      return {
        success: false,
        error: `Insufficient float balance! You need ${tx.amount} ETB float, but have ${agent.balance} ETB. Please contact Admin to top up your float.`,
      };
    }

    // Deduct agent float
    agent.balance -= tx.amount;
    agent.totalDepositsHandled += tx.amount;

    // Commission earned by agent
    const commission = Math.round(tx.amount * (agent.commissionRate / 100));
    agent.totalCommissionEarned += commission;

    // Credit player's wallet
    let user = this.gameEngine.users.get(tx.userId);
    if (!user) {
      user = { id: tx.userId, username: tx.username || 'AfroPlayer', mainWallet: 0, playWallet: 0 };
      this.gameEngine.users.set(tx.userId, user);
    }
    user.mainWallet += tx.amount;

    tx.status = 'approved';
    tx.agentId = agent.id;
    tx.processedAt = new Date().toLocaleTimeString();
    tx.processedBy = `Agent: ${agent.name}`;

    this.saveTransactions();
    this.saveAgents();

    return {
      success: true,
      message: `Verified and topped up ${tx.amount} ETB to ${tx.username}! You earned ${commission} ETB commission.`,
      transaction: tx,
      agentBalance: agent.balance,
      commissionEarned: commission,
      playerMainWallet: user.mainWallet,
      userId: tx.userId,
    };
  }

  // Agent rejects deposit request (e.g. money not received)
  agentRejectDeposit(agentId, txId, reason) {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: 'Agent not found' };

    const tx = this.transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, error: 'Deposit request not found' };
    if (tx.status !== 'pending') return { success: false, error: 'Request is already processed' };

    tx.status = 'rejected';
    tx.agentId = agent.id;
    tx.processedAt = new Date().toLocaleTimeString();
    tx.processedBy = `Agent: ${agent.name}`;
    tx.rejectionReason = reason || 'Deposit payment not received by agent';

    this.saveTransactions();

    return {
      success: true,
      message: `Deposit request for ${tx.amount} ETB rejected.`,
      transaction: tx,
      userId: tx.userId,
    };
  }

  // Agent directly tops up player by ID or Username (from Telegram cash receipt)
  agentTopupDirect(agentId, { playerQuery, amount, note }) {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: 'Agent not found' };

    const num = parseInt(amount);
    if (isNaN(num) || num <= 0) return { success: false, error: 'Invalid amount' };

    if (agent.balance < num) {
      return {
        success: false,
        error: `Insufficient float balance! You need ${num} ETB, but currently have ${agent.balance} ETB float.`,
      };
    }

    // Find player by ID or Username
    const q = (playerQuery || '').trim().toLowerCase();
    let targetUser = null;
    for (const u of this.gameEngine.users.values()) {
      if (
        u.id.toLowerCase() === q ||
        (u.username && u.username.toLowerCase() === q) ||
        (u.username && u.username.toLowerCase() === q.replace('@', ''))
      ) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      const cleanId = (playerQuery || '').trim().replace('#', '');
      if (cleanId) {
        targetUser = {
          id: cleanId,
          username: 'Player_' + cleanId,
          mainWallet: 0,
          playWallet: 0,
          joinedAt: new Date(),
        };
        this.gameEngine.users.set(cleanId, targetUser);
      } else {
        return {
          success: false,
          error: `Player "${playerQuery}" not found. Please provide a valid User ID or Telegram username.`,
        };
      }
    }

    // Deduct agent float
    agent.balance -= num;
    agent.totalDepositsHandled += num;

    // Commission
    const commission = Math.round(num * (agent.commissionRate / 100));
    agent.totalCommissionEarned += commission;

    // Credit user's wallet
    targetUser.mainWallet += num;

    // Create approved transaction record
    const tx = {
      id: 'tx_ag_topup_' + Date.now(),
      userId: targetUser.id,
      username: targetUser.username,
      type: 'deposit',
      amount: num,
      provider: 'agent_direct_transfer',
      accountNumber: agent.phone,
      referenceCode: `AG-${Math.floor(10000 + Math.random() * 90000)}`,
      agentId: agent.id,
      agentName: agent.name,
      status: 'approved',
      note: note || 'Direct Telegram Cash Top-up',
      createdAt: new Date().toLocaleTimeString(),
      processedAt: new Date().toLocaleTimeString(),
      processedBy: `Agent: ${agent.name}`,
    };
    this.addTransaction(tx);
    this.saveAgents();

    return {
      success: true,
      message: `Successfully topped up ${num} ETB to ${targetUser.username}! Earned ${commission} ETB commission.`,
      agentBalance: agent.balance,
      playerMainWallet: targetUser.mainWallet,
      commissionEarned: commission,
      transaction: tx,
    };
  }

  // Player submits deposit request assigned to an agent
  playerDepositViaAgent({ userId, agentId, amount, provider, accountNumber, referenceCode }) {
    const user = this.gameEngine.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return { success: false, error: 'Selected Agent not found' };

    const num = parseInt(amount);
    if (isNaN(num) || num <= 0) return { success: false, error: 'Invalid deposit amount' };

    const tx = {
      id: 'tx_ag_dep_' + Date.now(),
      userId: user.id,
      username: user.username,
      type: 'deposit',
      amount: num,
      provider: provider || 'telebirr',
      accountNumber: accountNumber || 'Unspecified',
      referenceCode: referenceCode || `REF-${Math.floor(10000 + Math.random() * 90000)}`,
      agentId: agent.id,
      agentName: agent.name,
      status: 'pending',
      createdAt: new Date().toLocaleTimeString(),
      processedAt: null,
    };

    this.transactions.unshift(tx);

    return {
      success: true,
      message: `Deposit request sent to agent "${agent.name}"! Once the agent verifies the transfer, your balance will be topped up immediately.`,
      transaction: tx,
      agentTelegram: agent.telegramUsername,
      agentPhone: agent.phone,
    };
  }

  // --- House Settings ---
  updateGameSettings(settings) {
    if (settings.stake !== undefined) {
      this.gameEngine.stake = Math.max(1, parseInt(settings.stake));
    }
    if (settings.houseCut !== undefined) {
      this.gameEngine.houseCut = Math.max(0, Math.min(0.5, parseFloat(settings.houseCut)));
    }
    if (settings.countdown !== undefined) {
      this.gameEngine.countdown = Math.max(10, parseInt(settings.countdown));
    }
    if (settings.enableSimulation !== undefined) {
      this.gameEngine.setSimulation(settings.enableSimulation);
    }
    if (settings.maxCartelasPerPlayer !== undefined) {
      this.gameEngine.setMaxCartelasPerPlayer(settings.maxCartelasPerPlayer);
    }
    if (settings.totalCartelas !== undefined) {
      this.gameEngine.setTotalCartelas(settings.totalCartelas);
    }
    if (settings.simulatedBotCount !== undefined) {
      this.gameEngine.setSimulatedBotCount(settings.simulatedBotCount);
    }
    if (settings.voiceLanguage !== undefined) {
      this.gameEngine.setVoiceLanguage(settings.voiceLanguage);
    }
    if (settings.voiceGender !== undefined) {
      this.gameEngine.setVoiceGender(settings.voiceGender);
    }
    if (settings.bonusSettings !== undefined) {
      this.gameEngine.saveBonusSettings(settings.bonusSettings);
    }
    if (settings.supportSettings !== undefined) {
      this.gameEngine.saveSupportSettings(settings.supportSettings);
    }
    return {
      success: true,
      stake: this.gameEngine.stake,
      houseCut: this.gameEngine.houseCut,
      countdown: this.gameEngine.countdown,
      enableSimulation: this.gameEngine.enableSimulation,
      maxCartelasPerPlayer: this.gameEngine.maxCartelasPerPlayer,
      totalCartelas: this.gameEngine.totalCartelas,
      simulatedBotCount: this.gameEngine.simulatedBotCount,
      voiceLanguage: this.gameEngine.voiceLanguage,
      voiceGender: this.gameEngine.voiceGender,
      bonusSettings: this.gameEngine.bonusSettings,
      supportSettings: this.gameEngine.supportSettings,
    };
  }

  forceNextRound() {
    if (this.gameEngine.callInterval) clearInterval(this.gameEngine.callInterval);
    if (this.gameEngine.timerInterval) clearInterval(this.gameEngine.timerInterval);
    this.gameEngine.startSelectionPhase();
    return { success: true, message: 'New round started immediately' };
  }

  // Clear Test Data (removes all data without touching Admin, Agents, and Payment Methods)
  clearTestData() {
    this.transactions = [];
    this.saveTransactions();

    if (this.gameEngine) {
      this.gameEngine.history = [];
      this.gameEngine.users.clear();
      this.gameEngine.saveUsers();
      this.gameEngine.takenCartelas.clear();
      this.gameEngine.startSelectionPhase();
    }

    return {
      success: true,
      message: '🧹 All data cleared successfully! (Admin, Agents, and Payment Methods preserved)',
    };
  }
}

module.exports = AdminService;
