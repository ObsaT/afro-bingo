import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { playDepositAlertSound, playWithdrawalAlertSound } from '../../utils/audio';
import {
  CreditCard,
  Users,
  Briefcase,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  LogOut,
  Search,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  Play,
  RotateCcw,
  Edit2,
  Phone,
  Power,
  Building2,
  Trash2,
} from 'lucide-react';

export default function AdminDashboard({ onExit }) {
  const [token, setToken] = useState(localStorage.getItem('afro_admin_token') || '');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'players' | 'agents' | 'settings'

  // Data states
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [players, setPlayers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [gameSettings, setGameSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filters & Search
  const [paymentFilter, setPaymentFilter] = useState('pending');
  const [withdrawalFilter, setWithdrawalFilter] = useState('all');
  const [playerSearch, setPlayerSearch] = useState('');

  // Modals
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTargetUser, setAdjustTargetUser] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('100');
  const [adjustWallet, setAdjustWallet] = useState('mainWallet');
  const [adjustNote, setAdjustNote] = useState('');

  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [showEditAgentModal, setShowEditAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [newAgent, setNewAgent] = useState({
    name: '',
    phone: '',
    bankName: 'Telebirr & CBE',
    accountNumber: '',
    telegramUsername: '',
    commissionRate: '7',
    initialFloat: '2000',
    pin: '1234',
  });

  const [showAgentFloatModal, setShowAgentFloatModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentFloatAmount, setAgentFloatAmount] = useState('1000');

  // Withdrawal Approval with optional transaction fee
  const [approvingWithdrawal, setApprovingWithdrawal] = useState(null);
  const [adminTxFee, setAdminTxFee] = useState('0');
  const [adminTxNotes, setAdminTxNotes] = useState('');

  // Bank Management states
  const [banks, setBanks] = useState([]);
  const [editingBank, setEditingBank] = useState(null);
  const [showEditBankModal, setShowEditBankModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBank, setNewBank] = useState({
    id: '',
    name: '',
    amharicName: '',
    category: 'RECOMMENDED',
    accountNumber: '',
    recipientName: '',
    minAmount: 50,
    maxAmount: 25000,
    bonusBadge: '',
    agentTelegram: 'afro_bingo_cashier',
    enabled: true,
  });

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        localStorage.setItem('afro_admin_token', data.token);
      } else {
        setLoginError(data.error || 'Invalid PIN');
      }
    } catch (err) {
      setLoginError('Server connection error');
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('afro_admin_token');
  };

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const showNotification = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/stats', { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      setStats(data);
    } catch (err) {}
  };

  // Fetch Payments
  const fetchPayments = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/payments?status=${paymentFilter}`, { headers: authHeaders });
      const data = await res.json();
      if (data.payments) setPayments(data.payments);
    } catch (err) {}
  };

  // Fetch Players
  const fetchPlayers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/players?search=${encodeURIComponent(playerSearch)}`, { headers: authHeaders });
      const data = await res.json();
      if (data.players) setPlayers(data.players);
    } catch (err) {}
  };

  // Fetch Agents
  const fetchAgents = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/agents', { headers: authHeaders });
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch (err) {}
  };

  // Fetch Game Settings
  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/game-settings', { headers: authHeaders });
      const data = await res.json();
      setGameSettings(data);
    } catch (err) {}
  };

  // Fetch Banks Configuration
  const fetchBanks = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/banks', { headers: authHeaders });
      const data = await res.json();
      if (data.banks) setBanks(data.banks);
    } catch (err) {}
  };

  useEffect(() => {
    if (token) {
      fetchStats();
      fetchPayments();
      fetchPlayers();
      fetchAgents();
      fetchSettings();
      fetchBanks();

      // Real-time Socket listener for incoming deposits & withdrawals with sound alerts
      const socket = io('/', { transports: ['websocket', 'polling'] });

      socket.on('new_deposit_request', (data) => {
        playDepositAlertSound();
        const amt = data.tx?.amount || 0;
        const who = data.tx?.username || data.tx?.accountNumber || 'Player';
        const method = data.tx?.bankName || 'Bank';
        showNotification(`💰 አዲስ ተቀማጭ ጥያቄ፡ ${amt} ETB ከ ${who} (${method})`);
        fetchPayments();
        fetchStats();
      });

      socket.on('new_withdrawal_request', (data) => {
        playWithdrawalAlertSound();
        const amt = data.tx?.netPayout || data.tx?.amount || 0;
        const who = data.tx?.fullName || data.tx?.username || 'Player';
        showNotification(`💸 አዲስ ገንዘብ ማውጣት ጥያቄ፡ ${amt} ETB ለ ${who}`);
        fetchPayments();
        fetchStats();
      });

      socket.on('transactions_updated', () => {
        fetchPayments();
        fetchStats();
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [token]);

  // Bank Actions
  const handleToggleBank = async (bankId) => {
    try {
      const res = await fetch(`/api/admin/banks/${bankId}/toggle`, {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Bank ${bankId} status updated!`);
        fetchBanks();
      }
    } catch (err) {
      alert('Failed to toggle bank');
    }
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    if (!editingBank) return;
    try {
      const res = await fetch(`/api/admin/banks/${editingBank.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(editingBank),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Bank ${editingBank.name} updated successfully!`);
        setShowEditBankModal(false);
        setEditingBank(null);
        fetchBanks();
      } else {
        alert(data.error || 'Failed to update bank');
      }
    } catch (err) {
      alert('Error updating bank settings');
    }
  };

  const handleAddBank = async (e) => {
    e.preventDefault();
    if (!newBank.name || !newBank.accountNumber) {
      alert('Bank name and account number are required');
      return;
    }
    try {
      const res = await fetch('/api/admin/banks', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newBank),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`New bank ${newBank.name} added!`);
        setShowAddBankModal(false);
        setNewBank({
          id: '',
          name: '',
          amharicName: '',
          category: 'RECOMMENDED',
          accountNumber: '',
          recipientName: '',
          minAmount: 50,
          maxAmount: 25000,
          bonusBadge: '',
          agentTelegram: 'afro_bingo_cashier',
          enabled: true,
        });
        fetchBanks();
      } else {
        alert(data.error || 'Failed to add bank');
      }
    } catch (err) {
      alert('Error adding bank');
    }
  };

  useEffect(() => {
    if (token) fetchPayments();
  }, [paymentFilter]);

  // Payment Actions
  const handleApprovePayment = async (txId) => {
    try {
      const res = await fetch(`/api/admin/payments/${txId}/approve`, {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Transaction ${txId} approved!`);
        fetchPayments();
        fetchStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to approve transaction');
    }
  };

  const handleRejectPayment = async (txId) => {
    const reason = prompt('Please enter rejection reason (e.g. Invalid payment reference):');
    if (!reason) return;
    try {
      const res = await fetch(`/api/admin/payments/${txId}/reject`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Transaction ${txId} rejected and refunded.`);
        fetchPayments();
        fetchStats();
      }
    } catch (err) {
      alert('Failed to reject transaction');
    }
  };

  // Manual Adjust Balance
  const handleConfirmAdjust = async () => {
    if (!adjustTargetUser) return;
    try {
      const res = await fetch('/api/admin/payments/adjust', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          userId: adjustTargetUser.id,
          amount: adjustAmount,
          walletType: adjustWallet,
          note: adjustNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Adjusted balance for ${adjustTargetUser.username}!`);
        setShowAdjustModal(false);
        fetchPlayers();
        fetchStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error updating balance');
    }
  };

  // Player Status
  const handleTogglePlayerStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'banned' : 'active';
    try {
      const res = await fetch(`/api/admin/players/${userId}/status`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Player status changed to ${nextStatus}!`);
        fetchPlayers();
      }
    } catch (err) {}
  };

  // Create Agent
  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/agents/create', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newAgent),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Agent ${newAgent.name} created!`);
        setShowAddAgentModal(false);
        setNewAgent({
          name: '',
          phone: '',
          bankName: 'Telebirr & CBE',
          accountNumber: '',
          telegramUsername: '',
          commissionRate: '7',
          initialFloat: '2000',
          pin: '1234',
        });
        fetchAgents();
        fetchStats();
      }
    } catch (err) {}
  };

  // Update Existing Agent
  const handleUpdateAgent = async (e) => {
    e.preventDefault();
    if (!editingAgent) return;
    try {
      const res = await fetch(`/api/admin/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(editingAgent),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Agent ${editingAgent.name} updated successfully!`);
        setShowEditAgentModal(false);
        fetchAgents();
      }
    } catch (err) {}
  };

  // Credit Agent Float
  const handleCreditAgent = async () => {
    if (!selectedAgent) return;
    try {
      const res = await fetch(`/api/admin/agents/${selectedAgent.id}/credit`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ amount: agentFloatAmount }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Credited ${agentFloatAmount} ETB float to ${selectedAgent.name}!`);
        setShowAgentFloatModal(false);
        fetchAgents();
      }
    } catch (err) {}
  };

  // Toggle Agent Status
  const handleToggleAgent = async (agentId) => {
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/toggle`, {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Agent status updated!');
        fetchAgents();
      }
    } catch (err) {}
  };

  // Toggle Simulation ON / OFF
  const handleToggleSimulation = async () => {
    const nextVal = !stats?.enableSimulation;
    try {
      const res = await fetch('/api/admin/simulation', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ enabled: nextVal }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Simulated Bot Players ${nextVal ? 'ENABLED' : 'PAUSED (Real Players Only)'}!`);
        fetchStats();
        fetchSettings();
      }
    } catch (err) {}
  };

  // Save Game Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/game-settings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(gameSettings),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Game settings updated successfully!');
        fetchStats();
      }
    } catch (err) {}
  };

  // Force Next Round
  const handleForceNext = async () => {
    if (!confirm('Force start the next round immediately?')) return;
    try {
      const res = await fetch('/api/admin/game/force-next', {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Forced next round initiated!');
        fetchStats();
      }
    } catch (err) {}
  };

  // Clear Test Data
  const handleClearTestData = async () => {
    if (
      !confirm(
        '⚠️ Are you sure you want to clear all data (test players, transactions, and game histories)?\n\n✅ Admin credentials, Agents, and Payment Methods will be strictly preserved.'
      )
    )
      return;
    try {
      const res = await fetch('/api/admin/clear-test-data', {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchPayments();
        fetchStats();
        fetchPlayers();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to clear test data');
    }
  };

  // Confirm Admin Approval of Withdrawal with Optional Transaction Fee
  const handleConfirmAdminApproval = async () => {
    if (!approvingWithdrawal) return;
    const feeNum = Math.max(0, parseFloat(adminTxFee) || 0);
    try {
      const res = await fetch('/api/admin/approve-withdrawal', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          txId: approvingWithdrawal.id,
          transactionFee: feeNum,
          notes: adminTxNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        setApprovingWithdrawal(null);
        fetchPayments();
        fetchStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Withdrawal approval failed');
    }
  };

  // --- Login Screen ---
  if (!token) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#100921] min-h-screen">
        <div className="w-full max-w-sm bg-[#1b123d] p-6 rounded-3xl border border-[#3b287d] shadow-2xl flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-yellow-400 flex items-center justify-center text-2xl font-black text-white shadow-lg mb-3">
            👑
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">Afro Bingo Admin</h2>
          <p className="text-xs text-gray-400 mt-1 mb-5">
            Manage payments, players, agents, and live game rooms
          </p>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
            <input
              type="password"
              placeholder="Enter Admin PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 bg-[#24194d] border border-[#3c2980] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
            />
            {loginError && <div className="text-xs text-red-400 font-semibold">{loginError}</div>}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black text-sm font-extrabold rounded-xl shadow-lg shadow-orange-500/20 transition active:scale-95"
            >
              Sign In to Admin Console
            </button>
            <button
              type="button"
              onClick={onExit}
              className="w-full py-2 text-xs text-gray-400 hover:text-white transition"
            >
              Back to Game
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Admin Dashboard Main View ---
  return (
    <div className="flex flex-col h-screen w-screen max-w-2xl mx-auto bg-[#100921] text-white overflow-hidden shadow-2xl select-none">
      {/* Admin Header - Fully Responsive for Mobile & APK */}
      <header className="bg-[#181038] border-b border-[#2d1e5e] px-3 py-2 flex flex-col gap-2 sticky top-0 z-30 shadow-md">
        {/* Top Row: Title, Status, and ALWAYS VISIBLE LOGOUT */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg">👑</span>
            <div>
              <h1 className="text-xs sm:text-sm font-extrabold text-white tracking-wide flex items-center gap-1.5">
                <span>Afro Bingo Admin</span>
                <span className="text-[9px] bg-green-500/20 text-green-400 font-bold px-1.5 py-0.2 rounded-full border border-green-500/30">
                  LIVE
                </span>
              </h1>
              <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                <span>Game #{stats?.gameId || '--'}</span>
                <span>•</span>
                <span className="text-yellow-400 font-bold">{stats?.gameState || 'ACTIVE'}</span>
              </div>
            </div>
          </div>

          {/* Top Right: Logout (ALWAYS visible & prominent) + Exit/Game */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onExit}
              className="px-2 py-1 bg-[#251950] hover:bg-[#342470] text-gray-300 text-[10px] sm:text-[11px] font-bold rounded-lg border border-[#3b287d] transition"
            >
              Game
            </button>
            <button
              onClick={handleLogout}
              title="Logout from Admin"
              className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] sm:text-[11px] font-black rounded-lg shadow-sm transition active:scale-95 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Action Row: Horizontal Scrollable on Mobile so all buttons are accessible without overflowing */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar scroll-smooth">
          {/* Quick Simulation Toggle */}
          <button
            onClick={handleToggleSimulation}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition shrink-0 ${
              stats?.enableSimulation
                ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                : 'bg-gray-700/40 text-gray-400 border-gray-600/40'
            }`}
            title="Toggle Bot Simulation"
          >
            <Power className="w-3 h-3" />
            <span>Bots: {stats?.enableSimulation ? 'ON' : 'OFF'}</span>
          </button>

          {/* Next Round */}
          <button
            onClick={handleForceNext}
            title="Force Next Round"
            className="flex items-center gap-1 px-2 py-1 bg-[#f05a28] hover:bg-[#ff6838] text-white text-[10px] font-bold rounded-lg shadow transition active:scale-95 shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Next Round</span>
          </button>

          {/* Clear Test Data */}
          <button
            onClick={handleClearTestData}
            title="Clear all test data"
            className="flex items-center gap-1 px-2 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 text-[10px] font-bold rounded-lg transition active:scale-95 shrink-0"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
            <span>Clear Data</span>
          </button>

          {/* Install APK */}
          <button
            onClick={() => {
              if (window.installPrompt) {
                window.installPrompt.prompt();
              } else {
                alert('📲 To install Afro Bingo Admin as an APK:\n\n1. Open Chrome menu (⋮)\n2. Tap "Install app" or "Add to Home screen"\n3. Tap "Install" to add the standalone App to your phone!');
              }
            }}
            title="Install Standalone APK to Home Screen"
            className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-[10px] font-bold rounded-lg transition active:scale-95 shrink-0"
          >
            <span>📲</span>
            <span>Install APK</span>
          </button>
        </div>
      </header>

      {/* Notification banner */}
      {feedback && (
        <div className="bg-green-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 animate-fade-in shadow-md">
          <CheckCircle className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPI Cards Overview */}
      <div className="p-3 grid grid-cols-4 gap-2 bg-[#140c2e] border-b border-[#251950]">
        <div className="bg-[#1f1545] p-2 rounded-xl border border-[#382677]">
          <div className="text-[9px] text-gray-400 uppercase font-semibold">Company Left Asset</div>
          <div className="text-xs md:text-sm font-black text-emerald-400 mt-0.5">
            {stats?.companyAssets?.companyMoneyAsset?.toLocaleString() || 0} <span className="text-[9px] text-gray-400">ETB</span>
          </div>
        </div>

        <div className="bg-[#1f1545] p-2 rounded-xl border border-[#382677]">
          <div className="text-[9px] text-gray-400 uppercase font-semibold">Total Cuts Retained</div>
          <div className="text-xs md:text-sm font-black text-[#ffcc00] mt-0.5">
            {stats?.companyAssets?.totalCompanyProfit?.toLocaleString() || 0} <span className="text-[9px] text-gray-400">ETB</span>
          </div>
        </div>

        <div className="bg-[#1f1545] p-2 rounded-xl border border-[#382677]">
          <div className="text-[9px] text-gray-400 uppercase font-semibold">Pending Cashout</div>
          <div className="text-xs md:text-sm font-black text-orange-400 mt-0.5">
            {stats?.pendingWithdrawalAmount || 0} <span className="text-[9px] text-gray-400">ETB</span>
          </div>
        </div>

        <div className="bg-[#1f1545] p-2 rounded-xl border border-[#382677]">
          <div className="text-[9px] text-gray-400 uppercase font-semibold">Withdrawals Paid (Success)</div>
          <div className="text-xs md:text-sm font-black text-cyan-400 mt-0.5">
            {stats?.companyAssets?.totalWithdrawalsNetPaid?.toLocaleString() || 0} <span className="text-[9px] text-gray-400">ETB</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#271b54] bg-[#160e33] px-2 pt-1 gap-1 overflow-x-auto">
        {[
          { id: 'payments', label: 'Cashier Queue', icon: CreditCard },
          { id: 'withdrawals', label: 'Withdrawals & Cuts (ማውጫ)', icon: DollarSign },
          { id: 'payment_settings', label: 'Payment & Banks', icon: Building2 },
          { id: 'agents', label: 'Agents (ወኪሎች)', icon: Briefcase },
          { id: 'players', label: 'Players', icon: Users },
          { id: 'settings', label: 'Game Rules', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl whitespace-nowrap transition ${
                isActive
                  ? 'bg-[#22164d] text-white border-t-2 border-orange-400 shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <main className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* ================= PAYMENTS TAB ================= */}
        {activeTab === 'payments' && (
          <div className="flex flex-col gap-3">
            {/* Filter Pills & Manual Adjust Button */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex rounded-lg overflow-hidden border border-[#382773] bg-[#1b123d]">
                {['pending', 'approved', 'rejected', 'all'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setPaymentFilter(f)}
                    className={`px-3 py-1 text-xs font-bold uppercase transition ${
                      paymentFilter === f ? 'bg-[#3b82f6] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setAdjustTargetUser(players[0] || { id: 'demo_user', username: 'Selected Player' });
                  setShowAdjustModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl shadow transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manual Balance Credit/Debit</span>
              </button>
            </div>

            {/* Payments List */}
            {payments.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs">No transactions in this filter</div>
            ) : (
              <div className="flex flex-col gap-2">
                {payments.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-[#1b123d] p-3 rounded-2xl border border-[#32226b] flex flex-col gap-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            tx.type === 'deposit'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}
                        >
                          {tx.type}
                        </span>
                        <span className="text-xs font-bold text-white">{tx.username}</span>
                        <span className="text-[10px] text-gray-400">({tx.userId})</span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-white">{tx.amount} ETB</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-[#24194d] p-2 rounded-xl text-[10px] text-gray-300">
                      <div>
                        <span className="text-gray-500">Provider:</span>{' '}
                        <span className="font-bold uppercase text-white">{tx.provider}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Account:</span>{' '}
                        <span className="font-mono text-white">{tx.accountNumber || '--'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Ref Code:</span>{' '}
                        <span className="font-mono text-yellow-300">{tx.referenceCode}</span>
                      </div>
                      {tx.agentName && (
                        <div className="col-span-3 text-[10px] text-cyan-300">
                          Assigned Agent: <span className="font-bold">{tx.agentName}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#291d57] text-[10px]">
                      <span className="text-gray-400">{tx.createdAt}</span>

                      {tx.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRejectPayment(tx.id)}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold rounded-lg border border-red-500/40 transition active:scale-95"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprovePayment(tx.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow transition active:scale-95"
                          >
                            Approve & Credit
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`font-bold uppercase ${
                            tx.status === 'approved' ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {tx.status} {tx.processedAt ? `(${tx.processedAt})` : ''} {tx.processedBy ? `by ${tx.processedBy}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= WITHDRAWALS & ASSETS TAB ================= */}
        {activeTab === 'withdrawals' && (
          <div className="flex flex-col gap-3">
            {/* 4 Financial Asset Summary Cards for the Bingo Company */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#382677]">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Company Left Money Asset</span>
                <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
                  {stats?.companyAssets?.companyMoneyAsset?.toLocaleString() || 0} ETB
                </span>
                <span className="text-[9px] text-gray-500">Net treasury liquidity</span>
              </div>

              <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#382677]">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Cuts Retained (10%)</span>
                <span className="text-base font-black text-orange-400 font-mono mt-0.5 block">
                  {stats?.companyAssets?.totalWithdrawalCuts?.toLocaleString() || 0} ETB
                </span>
                <span className="text-[9px] text-orange-300/70">From cashout cuts</span>
              </div>

              <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#382677]">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Withdrawals Success</span>
                <span className="text-base font-black text-cyan-400 font-mono mt-0.5 block">
                  {stats?.companyAssets?.totalWithdrawalsNetPaid?.toLocaleString() || 0} ETB
                </span>
                <span className="text-[9px] text-gray-500">Paid out to players</span>
              </div>

              <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#382677]">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Pending Payout Queue</span>
                <span className="text-base font-black text-yellow-300 font-mono mt-0.5 block">
                  {stats?.companyAssets?.pendingWithdrawalNetPayable?.toLocaleString() || 0} ETB
                </span>
                <span className="text-[9px] text-yellow-400/70">{stats?.companyAssets?.pendingWithdrawalsCount || 0} requests awaiting</span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex rounded-lg overflow-hidden border border-[#382773] bg-[#1b123d]">
                {['all', 'pending', 'approved', 'rejected'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setWithdrawalFilter(f)}
                    className={`px-3 py-1 text-xs font-bold uppercase transition ${
                      withdrawalFilter === f ? 'bg-[#10b981] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {f === 'approved' ? 'Success (Approved)' : f}
                  </button>
                ))}
              </div>

              <div className="text-xs text-gray-400">
                Company Cut: <b className="text-orange-400">{stats?.companyAssets?.withdrawalCutPercent || 10}%</b>
              </div>
            </div>

            {/* Withdrawals Table */}
            {(() => {
              const withdrawalList = payments
                .filter((t) => t.type === 'withdrawal')
                .filter((t) => (withdrawalFilter === 'all' ? true : t.status === withdrawalFilter));

              if (withdrawalList.length === 0) {
                return (
                  <div className="bg-[#1b123d] rounded-2xl p-10 text-center border border-[#32226b] text-gray-400 text-xs">
                    No withdrawal requests in this filter.
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto bg-[#1b123d] rounded-2xl border border-[#342470] shadow-md">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-[#24194d] text-gray-400 uppercase text-[10px] border-b border-[#362675]">
                      <tr>
                        <th className="py-2.5 px-3">Withdraw Request</th>
                        <th className="py-2.5 px-3">Player / Recipient</th>
                        <th className="py-2.5 px-3">Method & Account</th>
                        <th className="py-2.5 px-3 text-right">Amount (Gross)</th>
                        <th className="py-2.5 px-3 text-right text-orange-400">Cut (10%)</th>
                        <th className="py-2.5 px-3 text-right text-yellow-400">Tx Fee</th>
                        <th className="py-2.5 px-3 text-right text-green-400 font-bold">Actual Sent</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3">Agent</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a1b59]">
                      {withdrawalList.map((tx) => {
                        const cut = tx.cutAmount !== undefined ? tx.cutAmount : Math.round(tx.amount * 0.10);
                        const net = tx.netPayout !== undefined ? tx.netPayout : tx.amount - cut;
                        const actual = tx.actualPaidAmount !== undefined ? tx.actualPaidAmount : net;

                        return (
                          <tr key={tx.id} className="hover:bg-[#201548] transition">
                            <td className="py-3 px-3">
                              <span className="font-mono text-yellow-300 font-bold block">{tx.referenceCode || tx.id.slice(-6)}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{tx.createdAt}</span>
                            </td>

                            <td className="py-3 px-3">
                              <span className="text-white font-bold block">{tx.fullName || tx.username}</span>
                              <span className="text-[10px] text-gray-400 font-mono">ID: #{tx.userId}</span>
                            </td>

                            <td className="py-3 px-3">
                              <span className="text-cyan-300 font-bold block uppercase">{tx.provider}</span>
                              <span className="text-[10px] font-mono text-white">{tx.accountNumber}</span>
                            </td>

                            <td className="py-3 px-3 text-right font-mono text-white font-bold">{tx.amount} ETB</td>
                            <td className="py-3 px-3 text-right font-mono text-orange-400 font-bold">-{cut} ETB</td>
                            <td className="py-3 px-3 text-right font-mono text-yellow-400">
                              {tx.transactionFee ? `-${tx.transactionFee} ETB` : '0 ETB'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-400 font-black text-sm">+{actual} ETB</td>

                            <td className="py-3 px-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-md font-black uppercase text-[9px] ${
                                  tx.status === 'approved'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : tx.status === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {tx.status === 'approved' ? 'Success' : tx.status}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <span className="text-xs text-purple-300 font-bold block">{tx.agentName || 'Bole Agent'}</span>
                              <span className="text-[10px] text-gray-400">@{tx.agentTelegram || 'bole_afro_agent'}</span>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {tx.status === 'pending' ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleRejectPayment(tx.id)}
                                    className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs rounded-lg border border-red-500/30 transition active:scale-95"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => {
                                      setApprovingWithdrawal(tx);
                                      setAdminTxFee('0');
                                      setAdminTxNotes('');
                                    }}
                                    className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold text-xs rounded-lg shadow transition active:scale-95"
                                  >
                                    Pay & Approve
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-gray-500 italic">
                                  {tx.processedBy || tx.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= PLAYERS TAB ================= */}
        {activeTab === 'players' && (
          <div className="flex flex-col gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search player by name or ID..."
                value={playerSearch}
                onChange={(e) => {
                  setPlayerSearch(e.target.value);
                  fetchPlayers();
                }}
                className="w-full pl-9 pr-4 py-2 bg-[#1b123d] border border-[#32226b] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Players List */}
            <div className="flex flex-col gap-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#1b123d] p-3 rounded-2xl border border-[#32226b] flex flex-col gap-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{p.username || p.firstName}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            p.status === 'banned'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : 'bg-green-500/20 text-green-400 border border-green-500/40'
                          }`}
                        >
                          {p.status || 'active'}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400">ID: #{p.id}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-white">
                        Main: <span className="text-green-400">{p.mainWallet} ETB</span>
                      </div>
                      <div className="text-[10px] font-bold text-[#ffcc00]">
                        Play: {p.playWallet} ETB
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#291d57] text-[10px]">
                    <span className="text-gray-400">
                      Played: {p.gamesPlayed || 0} | Won: {p.gamesWon || 0}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setAdjustTargetUser(p);
                          setShowAdjustModal(true);
                        }}
                        className="px-2.5 py-1 bg-[#251950] hover:bg-[#342470] text-cyan-300 font-bold rounded-lg border border-[#3b287d] transition"
                      >
                        Adjust Balance
                      </button>

                      <button
                        onClick={() => handleTogglePlayerStatus(p.id, p.status || 'active')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          p.status === 'banned'
                            ? 'bg-green-600/30 text-green-300 hover:bg-green-600/40'
                            : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                        }`}
                      >
                        {p.status === 'banned' ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        

        {/* ================= AGENTS TAB ================= */}
        {activeTab === 'agents' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white">Local Cashiers & Telegram Agents</h3>
                <p className="text-[10px] text-gray-400">Manage agent phone numbers, bank accounts & commission</p>
              </div>

              <button
                onClick={() => setShowAddAgentModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#f05a28] hover:bg-[#ff6838] text-white text-xs font-bold rounded-xl shadow transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Agent</span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {agents.map((ag) => (
                <div
                  key={ag.id}
                  className="bg-[#1b123d] p-3 rounded-2xl border border-[#32226b] flex flex-col gap-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-2">
                        <span>{ag.name}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            ag.status === 'active'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}
                        >
                          {ag.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-300 mt-0.5">
                        📱 Phone: <span className="font-mono text-yellow-300 font-bold">{ag.phone}</span>
                      </div>
                      <div className="text-[10px] text-gray-300">
                        🏦 {ag.bankName}: <span className="font-mono text-white">{ag.accountNumber}</span>
                      </div>
                      <div className="text-[10px] text-cyan-400">
                        💬 Telegram: @{ag.telegramUsername} | 🔑 PIN: {ag.pin || '1234'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-[#ffcc00]">
                        Float: {ag.balance.toLocaleString()} ETB
                      </div>
                      <div className="text-[10px] text-green-400 font-semibold">
                        Commission: {ag.commissionRate}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-[#251950] p-2 rounded-xl text-[10px] text-gray-300">
                    <div>
                      <span className="text-gray-500">Deposits Handled:</span>{' '}
                      <span className="font-bold text-white">{ag.totalDepositsHandled.toLocaleString()} ETB</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Commission Earned:</span>{' '}
                      <span className="font-bold text-green-400">{ag.totalCommissionEarned.toLocaleString()} ETB</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#291d57] text-[10px]">
                    <span className="text-gray-400">Onboarded: {ag.totalPlayersOnboarded}</span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingAgent({ ...ag });
                          setShowEditAgentModal(true);
                        }}
                        className="px-2.5 py-1 bg-[#251950] hover:bg-[#342470] text-cyan-300 font-bold rounded-lg border border-[#3b287d] transition flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Details</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedAgent(ag);
                          setShowAgentFloatModal(true);
                        }}
                        className="px-2.5 py-1 bg-green-600/30 hover:bg-green-600/40 text-green-300 font-bold rounded-lg border border-green-500/40 transition active:scale-95"
                      >
                        + Add Float
                      </button>

                      <button
                        onClick={() => handleToggleAgent(ag.id)}
                        className="px-2.5 py-1 bg-[#251950] hover:bg-[#342470] text-gray-300 font-bold rounded-lg border border-[#3b287d] transition"
                      >
                        {ag.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        

        {/* ================= SETTINGS TAB ================= */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-3">
            {/* Simulation Pause / Play Switch (User Requested) */}
            <div className="bg-[#1e1445] p-4 rounded-2xl border border-purple-500/40 shadow-lg flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>🤖</span>
                    <span>Automated Player Simulation (Test Mode)</span>
                  </h3>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    {stats?.enableSimulation
                      ? 'ACTIVE: Simulating 30-50 players in rooms for testing'
                      : 'PAUSED: Simulation is paused. Only real connected players can play!'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSimulation}
                  className={`w-14 h-7 flex items-center rounded-full p-1 transition duration-300 ${
                    stats?.enableSimulation ? 'bg-[#10b981]' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition duration-300 ${
                      stats?.enableSimulation ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="text-[10px] text-gray-400 mt-1">
                Toggle OFF to pause all simulated bot players completely. When turned off, cartelas are only claimed by human players who join through Telegram.
              </div>
            </div>

            {/* Game Parameters */}
            <div className="bg-[#1b123d] p-4 rounded-2xl border border-[#32226b] flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-orange-400" />
                <span>House Configuration & Game Parameters</span>
              </h3>

              {gameSettings && (
                <form onSubmit={handleSaveSettings} className="flex flex-col gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                      Stake / Bet per Cartela (ETB)
                    </label>
                    <input
                      type="number"
                      value={gameSettings.stake}
                      onChange={(e) => setGameSettings({ ...gameSettings, stake: e.target.value })}
                      className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white"
                    />
                    <span className="text-[10px] text-gray-500">Default is 10 ETB per card</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                      House Rake / Cut Ratio (0.10 to 0.30)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={gameSettings.houseCut}
                      onChange={(e) => setGameSettings({ ...gameSettings, houseCut: e.target.value })}
                      className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white"
                    />
                    <span className="text-[10px] text-gray-500">
                      Current: {Math.round(gameSettings.houseCut * 100)}% goes to house,{' '}
                      {100 - Math.round(gameSettings.houseCut * 100)}% to Derash prize pool
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                      Selection Countdown Seconds
                    </label>
                    <input
                      type="number"
                      value={gameSettings.countdown}
                      onChange={(e) => setGameSettings({ ...gameSettings, countdown: e.target.value })}
                      className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white"
                    />
                    <span className="text-[10px] text-gray-500">Duration players have to pick cards before round begins</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                      Max Cartelas per Player (1 to 10 Cards)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={gameSettings.maxCartelasPerPlayer ?? 3}
                      onChange={(e) => setGameSettings({ ...gameSettings, maxCartelasPerPlayer: e.target.value })}
                      className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white"
                    />
                    <span className="text-[10px] text-gray-500">
                      Maximum number of cartelas each player can purchase and play per round (Default: 3)
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                      Total Cartelas in Game Room (e.g., 50, 100, 150, 200, 300)
                    </label>
                    <input
                      type="number"
                      min="20"
                      max="300"
                      value={gameSettings.totalCartelas ?? 100}
                      onChange={(e) => setGameSettings({ ...gameSettings, totalCartelas: e.target.value })}
                      className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white"
                    />
                    <span className="text-[10px] text-gray-500">
                      Total available cartelas displayed in the selection grid (Adjustable: 50, 100, 200...)
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                      Number of Simulated Bots per Round
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="150"
                      value={gameSettings.simulatedBotCount ?? 20}
                      onChange={(e) => setGameSettings({ ...gameSettings, simulatedBotCount: e.target.value })}
                      className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white"
                    />
                    <span className="text-[10px] text-gray-500">
                      Active bot simulation count when simulation is turned ON (Default: 20)
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                      Ball Announcer Voice Language (የድምፅ ቋንቋ)
                    </label>
                    <select
                      value={gameSettings.voiceLanguage || 'am'}
                      onChange={(e) => setGameSettings({ ...gameSettings, voiceLanguage: e.target.value })}
                      className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white"
                    >
                      <option value="am">🇪🇹 አማርኛ (Amharic - ቢ አስራ አምስት, አይ ሃያ ሁለት...)</option>
                      <option value="en">🇬🇧 English (B 15, I 22...)</option>
                    </select>
                    <span className="text-[10px] text-gray-500">
                      Language spoken by announcer when each number is drawn
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                      Announcer Person Sound (Girl / Man Voice - የሰው ድምፅ መረጣ)
                    </label>
                    <select
                      value={gameSettings.voiceGender || 'female'}
                      onChange={(e) => setGameSettings({ ...gameSettings, voiceGender: e.target.value })}
                      className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white"
                    >
                      <option value="female">👩 ሴት ድምፅ (Girl / Female Person Sound)</option>
                      <option value="male">👨 ወንድ ድምፅ (Man / Male Person Sound)</option>
                    </select>
                    <span className="text-[10px] text-gray-500">
                      Select human person's voice to call numbers (natural speech without electronic beeps)
                    </span>
                  </div>

                  {/* Account & Play Bonus Settings (የመለያ እና የጨዋታ ቦነስ ቅንብሮች) */}
                  <div className="bg-[#201548] p-3.5 rounded-2xl border border-yellow-500/40 flex flex-col gap-3 my-2 shadow-inner">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎁</span>
                      <div>
                        <h4 className="text-xs font-black text-yellow-300 uppercase tracking-wider">
                          Acc & Play Account Bonus Settings (የቦነስ ቅንብሮች)
                        </h4>
                        <p className="text-[10px] text-gray-300">
                          Configure how much users get in Main Account (Acc) and Play Account on first join and when inviting friends.
                        </p>
                      </div>
                    </div>

                    {/* Section 1: First Join Welcome Bonus */}
                    <div className="bg-[#180f38] p-3 rounded-xl border border-[#3b287d] flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                          <span>✨</span>
                          <span>First Join Bonus (አዲስ ምዝገባ ቦነስ)</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">Credited to new player</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-400 uppercase font-semibold block mb-0.5">
                            🎮 Play Account (ETB)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={gameSettings.bonusSettings?.firstJoin?.playAmount ?? 50}
                            onChange={(e) =>
                              setGameSettings({
                                ...gameSettings,
                                bonusSettings: {
                                  ...(gameSettings.bonusSettings || {}),
                                  firstJoin: {
                                    ...(gameSettings.bonusSettings?.firstJoin || {}),
                                    playAmount: parseFloat(e.target.value) || 0,
                                  },
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white font-mono"
                          />
                          <span className="text-[8px] text-gray-400">Used to buy cartelas to play</span>
                        </div>

                        <div>
                          <label className="text-[9px] text-gray-400 uppercase font-semibold block mb-0.5">
                            💳 Main Account / Acc (ETB)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={gameSettings.bonusSettings?.firstJoin?.accAmount ?? 0}
                            onChange={(e) =>
                              setGameSettings({
                                ...gameSettings,
                                bonusSettings: {
                                  ...(gameSettings.bonusSettings || {}),
                                  firstJoin: {
                                    ...(gameSettings.bonusSettings?.firstJoin || {}),
                                    accAmount: parseFloat(e.target.value) || 0,
                                  },
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white font-mono"
                          />
                          <span className="text-[8px] text-gray-400">Withdrawable cash balance</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Invitation / Referral Bonus */}
                    <div className="bg-[#180f38] p-3 rounded-xl border border-[#3b287d] flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                          <span>🤝</span>
                          <span>Invitation / Referral Rewards (የጓደኛ ግብዣ ቦነስ)</span>
                        </span>
                        <span className="text-[10px] text-cyan-400 font-semibold">Per invited friend</span>
                      </div>

                      {/* Inviter Rewards */}
                      <div className="text-[10px] text-yellow-300 font-bold uppercase tracking-wider">
                        1. Inviter Reward (ጋባዥ የሚያገኘው)
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-400 uppercase font-semibold block mb-0.5">
                            🎮 Inviter Play Account (ETB)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={gameSettings.bonusSettings?.invitation?.inviterPlayAmount ?? 20}
                            onChange={(e) =>
                              setGameSettings({
                                ...gameSettings,
                                bonusSettings: {
                                  ...(gameSettings.bonusSettings || {}),
                                  invitation: {
                                    ...(gameSettings.bonusSettings?.invitation || {}),
                                    inviterPlayAmount: parseFloat(e.target.value) || 0,
                                  },
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-gray-400 uppercase font-semibold block mb-0.5">
                            💳 Inviter Main Account / Acc (ETB)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={gameSettings.bonusSettings?.invitation?.inviterAccAmount ?? 5}
                            onChange={(e) =>
                              setGameSettings({
                                ...gameSettings,
                                bonusSettings: {
                                  ...(gameSettings.bonusSettings || {}),
                                  invitation: {
                                    ...(gameSettings.bonusSettings?.invitation || {}),
                                    inviterAccAmount: parseFloat(e.target.value) || 0,
                                  },
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      {/* Invited Friend Extra Bonus */}
                      <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider mt-1">
                        2. Invited Friend Extra Bonus (ተጋባዡ የሚያገኘው ተጨማሪ)
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-400 uppercase font-semibold block mb-0.5">
                            🎮 Friend Extra Play (ETB)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={gameSettings.bonusSettings?.invitation?.friendPlayAmount ?? 15}
                            onChange={(e) =>
                              setGameSettings({
                                ...gameSettings,
                                bonusSettings: {
                                  ...(gameSettings.bonusSettings || {}),
                                  invitation: {
                                    ...(gameSettings.bonusSettings?.invitation || {}),
                                    friendPlayAmount: parseFloat(e.target.value) || 0,
                                  },
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-gray-400 uppercase font-semibold block mb-0.5">
                            💳 Friend Extra Acc (ETB)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={gameSettings.bonusSettings?.invitation?.friendAccAmount ?? 0}
                            onChange={(e) =>
                              setGameSettings({
                                ...gameSettings,
                                bonusSettings: {
                                  ...(gameSettings.bonusSettings || {}),
                                  invitation: {
                                    ...(gameSettings.bonusSettings?.invitation || {}),
                                    friendAccAmount: parseFloat(e.target.value) || 0,
                                  },
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Support User & Help Desk Settings (የደንበኞች ድጋፍ መስጫ ቅንብር) */}
                  <div className="bg-[#1f164d] p-3.5 rounded-2xl border border-cyan-500/40 flex flex-col gap-3 my-2 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎧</span>
                        <div>
                          <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                            Customer Support User & Help Desk (የደንበኞች ድጋፍ መስጫ ቅንብር)
                          </h4>
                          <p className="text-[10px] text-gray-300">
                            Configure the support user handle, phone hotline, and links displayed to players for instant assistance.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {/* Telegram Support Username */}
                      <div>
                        <label className="text-[10px] text-gray-300 uppercase font-bold block mb-1">
                          💬 Support Telegram Username / Handle
                        </label>
                        <div className="flex items-center bg-[#251950] border border-[#3c2980] rounded-xl overflow-hidden px-2 py-1.5 focus-within:border-cyan-400">
                          <span className="text-xs text-gray-400 font-mono mr-1">@</span>
                          <input
                            type="text"
                            placeholder="afrobingo_support"
                            value={gameSettings.supportSettings?.telegramUsername ?? 'afrobingo_support'}
                            onChange={(e) =>
                              setGameSettings({
                                ...gameSettings,
                                supportSettings: {
                                  ...(gameSettings.supportSettings || {}),
                                  telegramUsername: e.target.value.replace(/^@/, ''),
                                },
                              })
                            }
                            className="w-full bg-transparent text-xs text-white outline-none font-mono"
                          />
                          {gameSettings.supportSettings?.telegramUsername && (
                            <a
                              href={`https://t.me/${(gameSettings.supportSettings?.telegramUsername || '').replace(/^@/, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] px-2 py-0.5 bg-cyan-600/30 text-cyan-300 rounded font-bold hover:bg-cyan-600/50 shrink-0 ml-1"
                            >
                              Test
                            </a>
                          )}
                        </div>
                        <span className="text-[8px] text-gray-400">Direct Telegram chat handle for players requiring assistance</span>
                      </div>

                      {/* Support Phone / Hotline */}
                      <div>
                        <label className="text-[10px] text-gray-300 uppercase font-bold block mb-1">
                          📞 Support Phone Number / Hotline
                        </label>
                        <input
                          type="text"
                          placeholder="+251911445566"
                          value={gameSettings.supportSettings?.phone ?? '+251911445566'}
                          onChange={(e) =>
                            setGameSettings({
                              ...gameSettings,
                              supportSettings: {
                                ...(gameSettings.supportSettings || {}),
                                phone: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white font-mono"
                        />
                        <span className="text-[8px] text-gray-400">Optional phone contact for direct calls or SMS</span>
                      </div>

                      {/* Support Officer Title */}
                      <div>
                        <label className="text-[10px] text-gray-300 uppercase font-bold block mb-1">
                          👤 Support Title / Name
                        </label>
                        <input
                          type="text"
                          placeholder="Afro Bingo Customer Support"
                          value={gameSettings.supportSettings?.title ?? 'Afro Bingo Customer Support'}
                          onChange={(e) =>
                            setGameSettings({
                              ...gameSettings,
                              supportSettings: {
                                ...(gameSettings.supportSettings || {}),
                                title: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white"
                        />
                        <span className="text-[8px] text-gray-400">Designation displayed on profile and bot (e.g. 24/7 Official Support)</span>
                      </div>

                      {/* Availability Hours */}
                      <div>
                        <label className="text-[10px] text-gray-300 uppercase font-bold block mb-1">
                          ⏰ Operating Hours
                        </label>
                        <input
                          type="text"
                          placeholder="24/7 Live Support"
                          value={gameSettings.supportSettings?.availableHours ?? '24/7 Live Support'}
                          onChange={(e) =>
                            setGameSettings({
                              ...gameSettings,
                              supportSettings: {
                                ...(gameSettings.supportSettings || {}),
                                availableHours: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white"
                        />
                        <span className="text-[8px] text-gray-400">E.g., 24/7 Live Support or 8:00 AM - 12:00 PM</span>
                      </div>

                      {/* Support Group URL */}
                      <div>
                        <label className="text-[10px] text-gray-300 uppercase font-bold block mb-1">
                          👥 Telegram Support Group URL
                        </label>
                        <input
                          type="text"
                          placeholder="https://t.me/afrobingo_support"
                          value={gameSettings.supportSettings?.supportGroup ?? 'https://t.me/afrobingo_support'}
                          onChange={(e) =>
                            setGameSettings({
                              ...gameSettings,
                              supportSettings: {
                                ...(gameSettings.supportSettings || {}),
                                supportGroup: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white font-mono"
                        />
                      </div>

                      {/* Support Channel URL */}
                      <div>
                        <label className="text-[10px] text-gray-300 uppercase font-bold block mb-1">
                          📢 Official Channel / Updates URL
                        </label>
                        <input
                          type="text"
                          placeholder="https://t.me/afrobingo_updates"
                          value={gameSettings.supportSettings?.supportChannel ?? 'https://t.me/afrobingo_updates'}
                          onChange={(e) =>
                            setGameSettings({
                              ...gameSettings,
                              supportSettings: {
                                ...(gameSettings.supportSettings || {}),
                                supportChannel: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Notice Message */}
                    <div>
                      <label className="text-[10px] text-gray-300 uppercase font-bold block mb-1">
                        📝 Support Help Note (English / አማርኛ)
                      </label>
                      <textarea
                        rows="2"
                        value={gameSettings.supportSettings?.notice ?? ''}
                        onChange={(e) =>
                          setGameSettings({
                            ...gameSettings,
                            supportSettings: {
                              ...(gameSettings.supportSettings || {}),
                              notice: e.target.value,
                            },
                          })
                        }
                        placeholder="ያጋጠሞትን ማንኛውንም የክፍያ ወይም የጨዋታ ጥያቄ በቴሌግራም አነጋግሩን።"
                        className="w-full px-2.5 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#f05a28] hover:bg-[#ff6838] text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 mt-2"
                  >
                    Save Settings
                  </button>
                </form>
              )}
            </div>

            {/* Database & Testing Tools (የዳታቤዝ እና የሙከራ ዳታ ማጽጃ) */}
            <div className="bg-[#1b123d] p-4 rounded-2xl border border-red-500/30 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Database & Test Data Cleaner (የሙከራ መረጃዎችን ማጽጃ)</span>
                  </h3>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    Clear all test data (players, transactions, and game histories) while preserving Admin, Agents, and Payment Methods.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClearTestData}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Test Data</span>
                </button>
              </div>

              <div className="text-[10px] text-gray-400 bg-[#140c2e] p-2.5 rounded-xl border border-[#2d1e5e]">
                💡 <b>Preserves Admin, Agents, and Payment Methods:</b> Flushes test players, deposit/withdrawal logs, and completed game rounds. Your Admin account, configured Agents, and Bank/Payment methods remain 100% intact.
              </div>
            </div>
          </div>
        )}

        

        {/* ================= PAYMENT & BANKS MANAGEMENT TAB ================= */}
        {activeTab === 'payment_settings' && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#1b123d] p-4 rounded-2xl border border-[#32226b] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>Payment Gateways & Supported Banks (የክፍያ ማስተዳደሪያ)</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Manage bank accounts, assign to agents, edit recipient names and min/max limits
                  </p>
                </div>

                <button
                  onClick={() => setShowAddBankModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bank</span>
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {banks.map((bank) => (
                  <div
                    key={bank.id}
                    className="bg-[#24194d] p-3 rounded-2xl border border-[#3a2777] flex flex-col gap-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sm font-black text-white border border-white/20">
                          {bank.logoText || '🏦'}
                        </div>
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-2">
                            <span>{bank.name}</span>
                            {bank.bonusBadge && (
                              <span className="text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded">
                                {bank.bonusBadge}
                              </span>
                            )}
                            <span
                              className={`text-[9px] px-2 py-0.2 rounded-full font-bold uppercase ${
                                bank.enabled
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                              }`}
                            >
                              {bank.enabled ? 'ACTIVE' : 'DISABLED'}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400">{bank.amharicName}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingBank({ ...bank });
                            setShowEditBankModal(true);
                          }}
                          className="px-2.5 py-1 bg-[#1a113a] hover:bg-[#2d1e63] text-cyan-300 font-bold rounded-lg border border-[#3c2980] transition text-[11px] flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleToggleBank(bank.id)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                            bank.enabled
                              ? 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30'
                              : 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30'
                          }`}
                        >
                          {bank.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>

                    {/* Bank Account and Recipient info */}
                    <div className="grid grid-cols-2 gap-2 bg-[#1b123d] p-2.5 rounded-xl text-[10px]">
                      <div>
                        <span className="text-gray-400 block font-semibold">የሂሳብ ቁጥር (Account Number):</span>
                        <span className="font-mono font-bold text-yellow-300 select-all">{bank.accountNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-semibold">የተቀባይ ስም (Recipient Name):</span>
                        <span className="font-bold text-white truncate block">{bank.recipientName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-semibold">Deposit Agent:</span>
                        <span className="text-cyan-400 font-bold">@{bank.agentTelegram}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-semibold">Min / Max Deposit:</span>
                        <span className="text-white font-medium">
                          {bank.minAmount} - {bank.maxAmount?.toLocaleString()} ETB
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-semibold">Withdrawal Status:</span>
                        <span className={`font-bold ${bank.allowWithdrawal !== false ? 'text-green-400' : 'text-gray-500'}`}>
                          {bank.allowWithdrawal !== false
                            ? `Active (${bank.minWithdrawal || 50}-${(bank.maxWithdrawal || 25000).toLocaleString()} ETB)`
                            : 'Disabled'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-semibold">Withdrawal Cashier:</span>
                        <span className="text-purple-300 font-bold">
                          @{bank.withdrawalAgentTelegram || bank.agentTelegram}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        
      </main>

      {/* --- MODAL: Manual Balance Adjustment --- */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#1b123d] p-5 rounded-3xl border border-[#3b287d] shadow-2xl flex flex-col gap-3">
            <h3 className="text-sm font-black text-white">Manual Balance Adjustment</h3>
            <div className="text-xs text-gray-300">
              Player: <span className="text-yellow-400 font-bold">{adjustTargetUser?.username}</span> (ID: {adjustTargetUser?.id})
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase font-semibold">Wallet to Adjust</label>
              <div className="flex rounded-lg overflow-hidden border border-[#3c2980] mt-1">
                <button
                  type="button"
                  onClick={() => setAdjustWallet('mainWallet')}
                  className={`flex-1 py-1 text-xs font-bold ${
                    adjustWallet === 'mainWallet' ? 'bg-[#3b82f6] text-white' : 'bg-[#251950] text-gray-400'
                  }`}
                >
                  Main Wallet
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustWallet('playWallet')}
                  className={`flex-1 py-1 text-xs font-bold ${
                    adjustWallet === 'playWallet' ? 'bg-[#3b82f6] text-white' : 'bg-[#251950] text-gray-400'
                  }`}
                >
                  Play Wallet
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase font-semibold">
                Amount (Use negative to debit e.g. -50)
              </label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-1"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase font-semibold">Reason / Note</label>
              <input
                type="text"
                placeholder="e.g. Telebirr manual deposit verification"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-1"
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 py-2 bg-[#251950] hover:bg-[#342470] text-gray-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdjust}
                className="flex-1 py-2 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl shadow"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Add Agent --- */}
      {showAddAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#1b123d] p-5 rounded-3xl border border-[#3b287d] shadow-2xl flex flex-col gap-3">
            <h3 className="text-sm font-black text-white">Create New Agent Account</h3>

            <form onSubmit={handleCreateAgent} className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Agent / Shop Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Merkato Station Agent"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Phone (Telebirr)</label>
                  <input
                    type="text"
                    required
                    placeholder="0911223344"
                    value={newAgent.phone}
                    onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Bank Name</label>
                  <input
                    type="text"
                    placeholder="CBE or Telebirr"
                    value={newAgent.bankName}
                    onChange={(e) => setNewAgent({ ...newAgent, bankName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Bank Account Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1000192837461"
                  value={newAgent.accountNumber}
                  onChange={(e) => setNewAgent({ ...newAgent, accountNumber: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Telegram Username</label>
                  <input
                    type="text"
                    placeholder="merkato_cashier"
                    value={newAgent.telegramUsername}
                    onChange={(e) => setNewAgent({ ...newAgent, telegramUsername: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Agent PIN</label>
                  <input
                    type="password"
                    placeholder="1234"
                    value={newAgent.pin}
                    onChange={(e) => setNewAgent({ ...newAgent, pin: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Commission %</label>
                  <input
                    type="number"
                    value={newAgent.commissionRate}
                    onChange={(e) => setNewAgent({ ...newAgent, commissionRate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Initial Float (ETB)</label>
                  <input
                    type="number"
                    value={newAgent.initialFloat}
                    onChange={(e) => setNewAgent({ ...newAgent, initialFloat: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  className="flex-1 py-2 bg-[#251950] text-gray-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#f05a28] text-white text-xs font-bold rounded-xl shadow"
                >
                  Create Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Edit Agent --- */}
      {showEditAgentModal && editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#1b123d] p-5 rounded-3xl border border-[#3b287d] shadow-2xl flex flex-col gap-3">
            <h3 className="text-sm font-black text-white">Edit Agent Profile</h3>

            <form onSubmit={handleUpdateAgent} className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Agent Name</label>
                <input
                  type="text"
                  required
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editingAgent.phone}
                    onChange={(e) => setEditingAgent({ ...editingAgent, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Bank Name</label>
                  <input
                    type="text"
                    value={editingAgent.bankName}
                    onChange={(e) => setEditingAgent({ ...editingAgent, bankName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Bank / Acc Number</label>
                <input
                  type="text"
                  required
                  value={editingAgent.accountNumber}
                  onChange={(e) => setEditingAgent({ ...editingAgent, accountNumber: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Telegram Username</label>
                  <input
                    type="text"
                    value={editingAgent.telegramUsername}
                    onChange={(e) => setEditingAgent({ ...editingAgent, telegramUsername: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Commission %</label>
                  <input
                    type="number"
                    value={editingAgent.commissionRate}
                    onChange={(e) => setEditingAgent({ ...editingAgent, commissionRate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Agent PIN</label>
                <input
                  type="text"
                  value={editingAgent.pin || '1234'}
                  onChange={(e) => setEditingAgent({ ...editingAgent, pin: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowEditAgentModal(false)}
                  className="flex-1 py-2 bg-[#251950] text-gray-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-600 text-white text-xs font-bold rounded-xl shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Credit Agent Float --- */}
      {showAgentFloatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#1b123d] p-5 rounded-3xl border border-[#3b287d] shadow-2xl flex flex-col gap-3">
            <h3 className="text-sm font-black text-white">Add Agent Float Balance</h3>
            <div className="text-xs text-gray-300">
              Agent: <span className="text-yellow-400 font-bold">{selectedAgent?.name}</span>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase font-semibold">Float Amount to Credit (ETB)</label>
              <input
                type="number"
                value={agentFloatAmount}
                onChange={(e) => setAgentFloatAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-1"
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setShowAgentFloatModal(false)}
                className="flex-1 py-2 bg-[#251950] text-gray-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreditAgent}
                className="flex-1 py-2 bg-green-600 text-white text-xs font-bold rounded-xl shadow"
              >
                Confirm Credit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Edit Supported Bank --- */}
      {showEditBankModal && editingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-sm bg-[#1b123d] p-5 rounded-3xl border border-[#3b287d] shadow-2xl flex flex-col gap-3 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#302066] pb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>Edit Bank / Payment System</span>
              </h3>
              <button
                onClick={() => setShowEditBankModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Bank / Service Name</label>
                <input
                  type="text"
                  required
                  value={editingBank.name}
                  onChange={(e) => setEditingBank({ ...editingBank, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Amharic Name</label>
                <input
                  type="text"
                  value={editingBank.amharicName || ''}
                  onChange={(e) => setEditingBank({ ...editingBank, amharicName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-yellow-400 uppercase font-bold">የሂሳብ ቁጥር (Account Number)</label>
                <input
                  type="text"
                  required
                  value={editingBank.accountNumber}
                  onChange={(e) => setEditingBank({ ...editingBank, accountNumber: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-yellow-500/50 rounded-xl text-xs font-mono text-yellow-300 mt-0.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-green-400 uppercase font-bold">የተቀባይ ስም (Recipient Name)</label>
                <input
                  type="text"
                  required
                  value={editingBank.recipientName}
                  onChange={(e) => setEditingBank({ ...editingBank, recipientName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-green-500/50 rounded-xl text-xs text-white mt-0.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-cyan-400 uppercase font-bold">Assigned Agent (ወኪል ምረጥ)</label>
                <select
                  value={editingBank.agentTelegram}
                  onChange={(e) => {
                    const selectedAg = agents.find((a) => a.telegramUsername === e.target.value);
                    if (selectedAg) {
                      setEditingBank({
                        ...editingBank,
                        agentTelegram: selectedAg.telegramUsername,
                        recipientName: selectedAg.name || editingBank.recipientName,
                        accountNumber: selectedAg.accountNumber || editingBank.accountNumber,
                      });
                    } else {
                      setEditingBank({ ...editingBank, agentTelegram: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.telegramUsername}>
                      {ag.name} (@{ag.telegramUsername}) - {ag.phone}
                    </option>
                  ))}
                  <option value={editingBank.agentTelegram}>Custom: @{editingBank.agentTelegram}</option>
                </select>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-gray-400">Telegram Handle: @</span>
                  <input
                    type="text"
                    required
                    value={editingBank.agentTelegram}
                    onChange={(e) => setEditingBank({ ...editingBank, agentTelegram: e.target.value.replace('@', '') })}
                    className="flex-1 px-2 py-1 bg-[#1c123d] border border-[#3c2980] rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Category</label>
                  <select
                    value={editingBank.category}
                    onChange={(e) => setEditingBank({ ...editingBank, category: e.target.value })}
                    className="w-full px-2 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  >
                    <option value="RECOMMENDED">RECOMMENDED</option>
                    <option value="BANK TRANSFER">BANK TRANSFER</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Bonus Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. 10%, 20%"
                    value={editingBank.bonusBadge || ''}
                    onChange={(e) => setEditingBank({ ...editingBank, bonusBadge: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Min Amount (ETB)</label>
                  <input
                    type="number"
                    value={editingBank.minAmount}
                    onChange={(e) => setEditingBank({ ...editingBank, minAmount: parseInt(e.target.value) || 25 })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Max Amount (ETB)</label>
                  <input
                    type="number"
                    value={editingBank.maxAmount}
                    onChange={(e) => setEditingBank({ ...editingBank, maxAmount: parseInt(e.target.value) || 25000 })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
              </div>

              {/* Withdrawal Configuration Section */}
              <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#3b287d] flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>💸</span>
                    <span>Withdrawal Settings (ገንዘብ ማውጣት)</span>
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newBank.allowWithdrawal !== false}
                      onChange={(e) => setNewBank({ ...newBank, allowWithdrawal: e.target.checked })}
                      className="rounded border-gray-600 text-green-500 focus:ring-0"
                    />
                    <span className="text-[10px] text-gray-300 font-semibold">Enable Cashout</span>
                  </label>
                </div>

                {newBank.allowWithdrawal !== false && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-gray-400 uppercase font-semibold">Min Withdrawal (ETB)</label>
                        <input
                          type="number"
                          value={newBank.minWithdrawal || 50}
                          onChange={(e) => setNewBank({ ...newBank, minWithdrawal: parseInt(e.target.value) || 25 })}
                          className="w-full px-2 py-1 bg-[#251950] border border-[#3c2980] rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 uppercase font-semibold">Max Withdrawal (ETB)</label>
                        <input
                          type="number"
                          value={newBank.maxWithdrawal || 25000}
                          onChange={(e) => setNewBank({ ...newBank, maxWithdrawal: parseInt(e.target.value) || 50000 })}
                          className="w-full px-2 py-1 bg-[#251950] border border-[#3c2980] rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] text-cyan-400 uppercase font-bold">Assigned Cashier for Withdrawals</label>
                      <select
                        value={newBank.withdrawalAgentTelegram || newBank.agentTelegram}
                        onChange={(e) => setNewBank({ ...newBank, withdrawalAgentTelegram: e.target.value })}
                        className="w-full px-2 py-1 bg-[#251950] border border-[#3c2980] rounded-lg text-xs text-white mt-0.5"
                      >
                        {agents.map((ag) => (
                          <option key={ag.id} value={ag.telegramUsername}>
                            {ag.name} (@{ag.telegramUsername}) - {ag.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowEditBankModal(false)}
                  className="flex-1 py-2 bg-[#251950] text-gray-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow"
                >
                  Save Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Add New Bank --- */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-sm bg-[#1b123d] p-5 rounded-3xl border border-[#3b287d] shadow-2xl flex flex-col gap-3 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#302066] pb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Supported Bank</span>
              </h3>
              <button
                onClick={() => setShowAddBankModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBank} className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Bank / Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sinqee Bank"
                  value={newBank.name}
                  onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Amharic Name</label>
                <input
                  type="text"
                  placeholder="e.g. ሲንቄ ባንክ"
                  value={newBank.amharicName}
                  onChange={(e) => setNewBank({ ...newBank, amharicName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-yellow-400 uppercase font-bold">የሂሳብ ቁጥር (Account Number)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1000987654321"
                  value={newBank.accountNumber}
                  onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-yellow-500/50 rounded-xl text-xs font-mono text-yellow-300 mt-0.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-green-400 uppercase font-bold">የተቀባይ ስም (Recipient Name)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abebe Balcha"
                  value={newBank.recipientName}
                  onChange={(e) => setNewBank({ ...newBank, recipientName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-green-500/50 rounded-xl text-xs text-white mt-0.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-cyan-400 uppercase font-bold">Assigned Agent (ወኪል ምረጥ)</label>
                <select
                  value={newBank.agentTelegram}
                  onChange={(e) => {
                    const selectedAg = agents.find((a) => a.telegramUsername === e.target.value);
                    if (selectedAg) {
                      setNewBank({
                        ...newBank,
                        agentTelegram: selectedAg.telegramUsername,
                        recipientName: selectedAg.name || newBank.recipientName,
                        accountNumber: selectedAg.accountNumber || newBank.accountNumber,
                      });
                    } else {
                      setNewBank({ ...newBank, agentTelegram: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.telegramUsername}>
                      {ag.name} (@{ag.telegramUsername}) - {ag.phone}
                    </option>
                  ))}
                  <option value="custom">Custom / Other Handle</option>
                </select>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-gray-400">Telegram Handle: @</span>
                  <input
                    type="text"
                    required
                    placeholder="afro_bingo_cashier"
                    value={newBank.agentTelegram}
                    onChange={(e) => setNewBank({ ...newBank, agentTelegram: e.target.value.replace('@', '') })}
                    className="flex-1 px-2 py-1 bg-[#1c123d] border border-[#3c2980] rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Category</label>
                  <select
                    value={newBank.category}
                    onChange={(e) => setNewBank({ ...newBank, category: e.target.value })}
                    className="w-full px-2 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  >
                    <option value="RECOMMENDED">RECOMMENDED</option>
                    <option value="BANK TRANSFER">BANK TRANSFER</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Bonus Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. 10%"
                    value={newBank.bonusBadge}
                    onChange={(e) => setNewBank({ ...newBank, bonusBadge: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-0.5"
                  />
                </div>
              </div>

              {/* Withdrawal Configuration Section */}
              <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#3b287d] flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>💸</span>
                    <span>Withdrawal Settings (ገንዘብ ማውጣት)</span>
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newBank.allowWithdrawal !== false}
                      onChange={(e) => setNewBank({ ...newBank, allowWithdrawal: e.target.checked })}
                      className="rounded border-gray-600 text-green-500 focus:ring-0"
                    />
                    <span className="text-[10px] text-gray-300 font-semibold">Enable Cashout</span>
                  </label>
                </div>

                {newBank.allowWithdrawal !== false && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-gray-400 uppercase font-semibold">Min Withdrawal (ETB)</label>
                        <input
                          type="number"
                          value={newBank.minWithdrawal || 50}
                          onChange={(e) => setNewBank({ ...newBank, minWithdrawal: parseInt(e.target.value) || 25 })}
                          className="w-full px-2 py-1 bg-[#251950] border border-[#3c2980] rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 uppercase font-semibold">Max Withdrawal (ETB)</label>
                        <input
                          type="number"
                          value={newBank.maxWithdrawal || 25000}
                          onChange={(e) => setNewBank({ ...newBank, maxWithdrawal: parseInt(e.target.value) || 50000 })}
                          className="w-full px-2 py-1 bg-[#251950] border border-[#3c2980] rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] text-cyan-400 uppercase font-bold">Assigned Cashier for Withdrawals</label>
                      <select
                        value={newBank.withdrawalAgentTelegram || newBank.agentTelegram}
                        onChange={(e) => setNewBank({ ...newBank, withdrawalAgentTelegram: e.target.value })}
                        className="w-full px-2 py-1 bg-[#251950] border border-[#3c2980] rounded-lg text-xs text-white mt-0.5"
                      >
                        {agents.map((ag) => (
                          <option key={ag.id} value={ag.telegramUsername}>
                            {ag.name} (@{ag.telegramUsername}) - {ag.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="flex-1 py-2 bg-[#251950] text-gray-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow"
                >
                  Add Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Admin Withdrawal Approval with Optional Transaction Fee */}
      {approvingWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#181038] rounded-3xl p-5 border border-[#3b287d] shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#2d1e5e] pb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>💸</span>
                <span>Confirm Withdrawal Payout (ገንዘብ ማውጣት ማጽደቂያ)</span>
              </h3>
              <button
                onClick={() => setApprovingWithdrawal(null)}
                className="text-gray-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Recipient Details */}
            <div className="bg-[#120a2e] p-3 rounded-xl border border-[#2c1d5c] flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Player:</span>
                <span className="font-bold text-white">{approvingWithdrawal.fullName || approvingWithdrawal.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Account / Telebirr:</span>
                <span className="font-mono text-yellow-300 font-bold">{approvingWithdrawal.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bank / Method:</span>
                <span className="font-bold text-cyan-300 uppercase">{approvingWithdrawal.provider}</span>
              </div>
            </div>

            {/* Calculation Breakdown */}
            <div className="bg-[#24174d] p-3 rounded-xl border border-[#3b277d] flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Gross Requested:</span>
                <span className="font-mono font-bold text-white">{approvingWithdrawal.amount} ETB</span>
              </div>
              <div className="flex justify-between text-orange-400">
                <span>Company Cut (10%):</span>
                <span className="font-mono font-bold">
                  -{approvingWithdrawal.cutAmount !== undefined ? approvingWithdrawal.cutAmount : Math.round(approvingWithdrawal.amount * 0.10)} ETB
                </span>
              </div>
              <div className="flex justify-between text-gray-300 border-t border-[#372674] pt-1">
                <span>Base Net Payable:</span>
                <span className="font-mono font-bold text-green-300">
                  {approvingWithdrawal.netPayout !== undefined
                    ? approvingWithdrawal.netPayout
                    : approvingWithdrawal.amount - (approvingWithdrawal.cutAmount || Math.round(approvingWithdrawal.amount * 0.10))}{' '}
                  ETB
                </span>
              </div>
            </div>

            {/* Optional Transaction Fee Input */}
            <div className="flex flex-col gap-1.5 bg-[#1e1346] p-3 rounded-xl border border-yellow-500/30">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-1">
                  <span>⚡</span>
                  <span>Transaction Fee (የባንክ ክፍያ - Optional)</span>
                </label>
                <span className="text-[9px] text-gray-400">Default: 0 ETB</span>
              </div>
              <p className="text-[10px] text-gray-300">
                Insert transfer fee if bank/Telebirr charged cost, so balance is accurate and not miscommunicated.
              </p>

              <div className="relative mt-1">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={adminTxFee}
                  onChange={(e) => setAdminTxFee(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-[#120a2e] border border-[#3c2980] rounded-xl text-sm font-mono font-bold text-yellow-300 focus:outline-none focus:border-yellow-400"
                />
                <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">ETB</span>
              </div>

              {/* Quick Fee Presets */}
              <div className="flex items-center gap-1.5 mt-0.5">
                {['0', '2', '5', '10'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setAdminTxFee(f)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition border ${
                      adminTxFee === f
                        ? 'bg-yellow-500/30 text-yellow-200 border-yellow-500/60'
                        : 'bg-[#291b5c] text-gray-300 border-[#38267a] hover:bg-[#342470]'
                    }`}
                  >
                    {f} ETB
                  </button>
                ))}
              </div>
            </div>

            {/* Final Sent Payout Preview */}
            <div className="bg-[#102d1e] p-2.5 rounded-xl border border-emerald-500/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-300 uppercase font-semibold block">Actual Sent to Player</span>
                <span className="text-[9px] text-emerald-400 font-medium">Net Payout - Transaction Fee</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-emerald-300 font-mono">
                  {Math.max(
                    0,
                    (approvingWithdrawal.netPayout !== undefined
                      ? approvingWithdrawal.netPayout
                      : approvingWithdrawal.amount - (approvingWithdrawal.cutAmount || Math.round(approvingWithdrawal.amount * 0.10))) -
                      (parseFloat(adminTxFee) || 0)
                  )}{' '}
                  <span className="text-xs">ETB</span>
                </span>
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">
                Receipt / Tx Reference Note (Optional)
              </label>
              <input
                type="text"
                value={adminTxNotes}
                onChange={(e) => setAdminTxNotes(e.target.value)}
                placeholder="e.g., Telebirr Tx #7AG891K..."
                className="w-full px-3 py-1.5 bg-[#120a2e] border border-[#3c2980] rounded-xl text-xs text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setApprovingWithdrawal(null)}
                className="flex-1 py-2.5 bg-[#251950] text-gray-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAdminApproval}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white text-xs font-black rounded-xl shadow-lg transition active:scale-95"
              >
                Confirm & Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
