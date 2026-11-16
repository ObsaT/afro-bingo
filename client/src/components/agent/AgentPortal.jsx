import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { playDepositAlertSound, playWithdrawalAlertSound } from '../../utils/audio';
import { parseEthiopianSms } from '../../utils/smsParser';
import {
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  UserCheck,
  Send,
  LogOut,
  RefreshCw,
  Phone,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  BellRing,
  Power,
  Radio,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  FileText,
  ExternalLink,
} from 'lucide-react';

export default function AgentPortal({ onExit }) {
  const [phone, setPhone] = useState(localStorage.getItem('afro_agent_phone') || '');
  const [pin, setPin] = useState(localStorage.getItem('afro_agent_pin') || '');
  const [agent, setAgent] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('afro_agent_token') || '');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dashboard Data
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [allWithdrawals, setAllWithdrawals] = useState([]);
  const [companyAssets, setCompanyAssets] = useState(null);
  const [recentProcessed, setRecentProcessed] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('deposits'); // 'deposits' | 'withdrawals' | 'sms' | 'assets'
  const [verifiedReceipts, setVerifiedReceipts] = useState([]);

  // Fast SMS Scanner / Auto-Approval
  const [agentSmsInput, setAgentSmsInput] = useState('');
  const [smsScanning, setSmsScanning] = useState(false);
  const [smsScanResult, setSmsScanResult] = useState(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Direct Top-Up Modal
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [directPlayer, setDirectPlayer] = useState('');
  const [directAmount, setDirectAmount] = useState('100');
  const [directNote, setDirectNote] = useState('');

  // Approval with Optional Transaction Fee Modal
  const [approvingWithdrawal, setApprovingWithdrawal] = useState(null);
  const [txFee, setTxFee] = useState('0');
  const [txNotes, setTxNotes] = useState('');
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const showNotification = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Toggle Agent Online / Offline Availability
  const handleToggleAvailability = async () => {
    if (!agent) return;
    setTogglingAvailability(true);
    const newStatus = agent.isAvailable === false ? true : false;
    try {
      const res = await fetch(`/api/agent/${agent.id}/toggle-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setAgent((prev) => ({
          ...prev,
          isAvailable: newStatus,
          availableNote: data.agent.availableNote,
        }));
        showNotification(
          newStatus
            ? '🟢 እርስዎ አሁን ክፍት (Online) ነዎት! ተጫዋቾች ተቀማጭ መላክ ይችላሉ።'
            : '🔴 እርስዎ አሁን ተዘግተዋል (Offline)! ተጫዋቾች ተቀማጭ መላክ አይችሉም።'
        );
      } else {
        alert(data.error || 'Failed to update availability');
      }
    } catch (err) {
      alert('Error updating availability');
    } finally {
      setTogglingAvailability(false);
    }
  };

  // Agent Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const res = await fetch('/api/agent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setAgent(data.agent);
        localStorage.setItem('afro_agent_token', data.token);
        localStorage.setItem('afro_agent_phone', phone);
        localStorage.setItem('afro_agent_pin', pin);
        fetchDashboard(data.agent.id);
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setAgent(null);
    setPhone('');
    setPin('');
    localStorage.removeItem('afro_agent_token');
    localStorage.removeItem('afro_agent_phone');
    localStorage.removeItem('afro_agent_pin');
  };

  // Fetch Agent Dashboard
  const fetchDashboard = async (agentId) => {
    const id = agentId || agent?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/agent/${id}/dashboard`);
      const data = await res.json();
      if (data.success) {
        setAgent(data.agent);
        setPendingRequests(data.pendingRequests || []);
        setPendingWithdrawals(data.pendingWithdrawals || []);
        setAllWithdrawals(data.allWithdrawals || []);
        setCompanyAssets(data.companyAssets || null);
        setRecentProcessed(data.recentProcessed || []);
      }
      fetchVerifiedReceipts(id);
    } catch (err) {}
  };

  const fetchVerifiedReceipts = async (agentId) => {
    const id = agentId || agent?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/agent/${id}/verified-receipts`);
      const data = await res.json();
      if (data.success && data.receipts) {
        setVerifiedReceipts(data.receipts);
      }
    } catch (err) {}
  };

  // Agent SMS Ingestion & Fast Auto-Approval
  const handleProcessAgentSms = async (textToProcess) => {
    const input = (textToProcess || agentSmsInput).trim();
    if (!input || !agent) return;
    setSmsScanning(true);
    setSmsScanResult(null);

    try {
      const res = await fetch('/api/agent/incoming-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smsText: input,
          agentId: agent.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSmsScanResult({
          type: 'success',
          msg: data.message,
          data: data,
        });
        showNotification(data.message);
        setAgentSmsInput('');
        fetchDashboard(agent.id);
      } else {
        setSmsScanResult({
          type: 'error',
          msg: data.error || 'Failed to process SMS receipt',
        });
      }
    } catch (err) {
      setSmsScanResult({
        type: 'error',
        msg: 'Server/network error processing SMS',
      });
    } finally {
      setSmsScanning(false);
    }
  };

  useEffect(() => {
    if (token && phone) {
      // Auto login on mount if credentials stored
      fetch('/api/agent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setAgent(data.agent);
            fetchDashboard(data.agent.id);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Real-time socket & polling for instant deposit & withdrawal reception
  useEffect(() => {
    if (!agent) return;

    const socket = io('/', { transports: ['websocket', 'polling'] });

    socket.on('new_deposit_request', (data) => {
      const isForMe =
        data.agentId === agent.id ||
        data.agentTelegram?.toLowerCase() === agent.telegramUsername?.toLowerCase() ||
        !data.agentId;

      if (isForMe) {
        setPendingRequests((prev) => {
          if (prev.some((p) => p.id === data.tx.id)) return prev;
          return [data.tx, ...prev];
        });
        showNotification(`💰 አዲስ ተቀማጭ ጥያቄ፡ ${data.tx.amount} ETB ከ ${data.tx.username || data.tx.accountNumber}!`);
        playDepositAlertSound();
      }
    });

    socket.on('new_withdrawal_request', (data) => {
      const isForMe =
        data.tx.agentId === agent.id ||
        data.tx.agentTelegram?.toLowerCase() === agent.telegramUsername?.toLowerCase() ||
        !data.tx.agentId;

      if (isForMe) {
        setPendingWithdrawals((prev) => {
          if (prev.some((p) => p.id === data.tx.id)) return prev;
          return [data.tx, ...prev];
        });
        showNotification(`💸 አዲስ ገንዘብ ማውጣት ጥያቄ፡ ${data.tx.netPayout || data.tx.amount} ETB ለ ${data.tx.fullName || data.tx.username}!`);
        playWithdrawalAlertSound();
      }
    });

    socket.on('agent_dashboard_updated', (data) => {
      if (data.agentId === agent.id) {
        fetchDashboard(agent.id);
      }
    });

    socket.on('transactions_updated', () => {
      fetchDashboard(agent.id);
    });

    // 4-second polling fallback so nothing is missed
    const interval = setInterval(() => {
      fetchDashboard(agent.id);
    }, 4000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [agent?.id]);

  // Open Modal to Approve Withdrawal with Optional Transaction Fee
  const handleStartApproveWithdrawal = (req) => {
    setApprovingWithdrawal(req);
    setTxFee('0');
    setTxNotes('');
  };

  // Submit Approval of Withdrawal with Optional Transaction Fee
  const handleConfirmApproval = async () => {
    if (!approvingWithdrawal) return;
    const feeNum = Math.max(0, parseFloat(txFee) || 0);
    try {
      const res = await fetch(`/api/agent/${agent.id}/approve-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txId: approvingWithdrawal.id,
          transactionFee: feeNum,
          notes: txNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        setApprovingWithdrawal(null);
        fetchDashboard(agent.id);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Withdrawal approval failed');
    }
  };

  // Reject Withdrawal
  const handleRejectWithdrawal = async (txId) => {
    const reason = prompt('የውድቅ ማድረጊያ ምክንያት (Reason for rejecting withdrawal):', 'የተሳሳተ የባንክ/ስልክ ሂሳብ ቁጥር (Invalid account number or name mismatch)');
    if (!reason) return;
    try {
      const res = await fetch(`/api/agent/${agent.id}/reject-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId, reason }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchDashboard(agent.id);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Reject request failed');
    }
  };

  // Verify and Approve Deposit Request
  const handleVerifyDeposit = async (txId) => {
    if (!confirm('ባንክዎ ወይም ቴሌብር ላይ ገንዘቡ መግባቱን አረጋግጠዋል? (Have you confirmed receipt in your bank/Telebirr account?)')) return;
    try {
      const res = await fetch(`/api/agent/${agent.id}/verify-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchDashboard(agent.id);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Verification request failed');
    }
  };

  // Reject Deposit Request
  const handleRejectDeposit = async (txId) => {
    const reason = prompt('የውድቅ ማድረጊያ ምክንያት (Reason):', 'ገንዘቡ በባንክ ሂሳብ አልደረሰም (Payment not received in account)');
    if (!reason) return;
    try {
      const res = await fetch(`/api/agent/${agent.id}/reject-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId, reason }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        fetchDashboard(agent.id);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Reject request failed');
    }
  };

  // Direct Top-up to Player
  const handleDirectTopup = async (e) => {
    e.preventDefault();
    if (!directPlayer) {
      alert('Please enter player username or ID');
      return;
    }
    try {
      const res = await fetch(`/api/agent/${agent.id}/topup-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerQuery: directPlayer,
          amount: directAmount,
          note: directNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message);
        setShowDirectModal(false);
        setDirectPlayer('');
        setDirectAmount('100');
        setDirectNote('');
        fetchDashboard(agent.id);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Top-up request failed');
    }
  };

  // --- LOGIN SCREEN ---
  if (!token || !agent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#100921] min-h-screen text-white select-none">
        <div className="w-full max-w-sm bg-[#1b123d] p-6 rounded-3xl border border-[#3b287d] shadow-2xl flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-2xl font-black text-white shadow-lg mb-3">
            🤝
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">Afro Bingo Agent Portal</h2>
          <div className="text-xs text-yellow-300 font-bold mt-0.5">የወኪሎች መግቢያ</div>
          <p className="text-xs text-gray-400 mt-2 mb-4 leading-relaxed">
            Check deposits on your account, top up player balances, and earn your commission.
          </p>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase block text-left mb-1">
                Agent Phone Number
              </label>
              <input
                type="text"
                placeholder="Enter Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#251950] border border-[#3c2980] rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase block text-left mb-1">
                Agent Passcode / PIN
              </label>
              <input
                type="password"
                placeholder="Enter Passcode / PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#251950] border border-[#3c2980] rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            {loginError && <div className="text-xs text-red-400 font-semibold">{loginError}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-sm font-extrabold rounded-xl shadow-lg transition active:scale-95 mt-1"
            >
              {loading ? 'Verifying...' : 'Sign In as Agent'}
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

  // --- LOGGED IN AGENT DASHBOARD ---
  return (
    <div className="flex flex-col h-screen w-screen max-w-lg mx-auto bg-[#100921] text-white overflow-hidden shadow-2xl select-none">
      {/* Header - Fully Responsive for Mobile & APK */}
      <header className="bg-[#181038] border-b border-[#2d1e5e] px-3 py-2 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="w-8 h-8 rounded-xl bg-cyan-600 flex items-center justify-center font-black text-white text-sm shadow shrink-0">
            🤝
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-black text-white tracking-wide truncate">{agent.name}</h1>
            <div className="text-[10px] text-gray-400 truncate">
              📱 {agent.phone} • <span className="text-cyan-400">@{agent.telegramUsername}</span>
            </div>
          </div>
        </div>

        {/* Right buttons: LOGOUT ALWAYS VISIBLE */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              if (window.installPrompt) {
                window.installPrompt.prompt();
              } else {
                alert('📲 To install Afro Bingo Agent as an APK:\n\n1. Open Chrome menu (⋮)\n2. Tap "Install app" or "Add to Home screen"\n3. Tap "Install"!');
              }
            }}
            title="Install APK"
            className="p-1 sm:px-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-[10px] font-bold rounded-lg transition active:scale-95 shrink-0"
          >
            <span>📲</span>
            <span className="hidden sm:inline ml-0.5">APK</span>
          </button>

          <button
            onClick={() => fetchDashboard()}
            className="p-1.5 bg-[#251950] hover:bg-[#342470] text-gray-300 rounded-lg border border-[#3b287d] transition shrink-0"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onExit}
            className="px-2 py-1 bg-[#251950] hover:bg-[#342470] text-gray-300 text-[10px] font-bold rounded-lg border border-[#3b287d] transition shrink-0"
          >
            Game
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg shadow-sm transition active:scale-95 shrink-0"
            title="Logout from Agent Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
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

      {/* Real-time Agent Availability Toggle Banner */}
      <div
        className={`p-3 border-b transition-colors ${
          agent.isAvailable !== false
            ? 'bg-gradient-to-r from-emerald-950/70 via-[#132822] to-[#120a2a] border-emerald-500/30'
            : 'bg-gradient-to-r from-rose-950/70 via-[#2d121c] to-[#120a2a] border-rose-500/30'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                agent.isAvailable !== false
                  ? 'bg-emerald-500 text-black shadow-emerald-500/30 animate-pulse'
                  : 'bg-rose-600 text-white shadow-rose-600/30'
              }`}
            >
              {agent.isAvailable !== false ? (
                <Radio className="w-5 h-5" />
              ) : (
                <Power className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white tracking-wide">
                  {agent.isAvailable !== false ? 'ONLINE & ACCEPTING DEPOSITS' : 'OFFLINE (PAUSED)'}
                </span>
                <span
                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    agent.isAvailable !== false
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {agent.isAvailable !== false ? 'ክፍት ነው' : 'ተዘግቷል'}
                </span>
              </div>
              <p className="text-[10px] text-gray-300 mt-0.5 truncate">
                {agent.isAvailable !== false
                  ? 'ተጫዋቾች አሁን ወደ ሂሳብዎ ተቀማጭ ማድረግ ይችላሉ (Players can pay)'
                  : 'ተጫዋቾች ክፍያ መላክ አይችሉም (New deposits are blocked)'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleAvailability}
            disabled={togglingAvailability}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold shadow-md transition active:scale-95 shrink-0 flex items-center gap-1.5 ${
              agent.isAvailable !== false
                ? 'bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-400/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-300/50'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>
              {togglingAvailability
                ? '...'
                : agent.isAvailable !== false
                ? 'Go Offline (እረፍት)'
                : 'Go Online (ክፍት)'}
            </span>
          </button>
        </div>
      </div>

      {/* Float & Commission KPI Cards */}
      <div className="p-3 grid grid-cols-2 gap-2.5 bg-[#140c2e] border-b border-[#251950]">
        <div className="bg-[#1f1545] p-3 rounded-2xl border border-[#382677] shadow-md">
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">Available Float</span>
          <div className="text-2xl font-black text-[#ffcc00] mt-0.5">
            {agent.balance.toLocaleString()} <span className="text-xs font-normal text-gray-400">ETB</span>
          </div>
          <span className="text-[10px] text-gray-400">Used to top up players</span>
        </div>

        <div className="bg-[#1f1545] p-3 rounded-2xl border border-[#382677] shadow-md">
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Commission</span>
          <div className="text-2xl font-black text-green-400 mt-0.5">
            {agent.totalCommissionEarned.toLocaleString()} <span className="text-xs font-normal text-gray-400">ETB</span>
          </div>
          <span className="text-[10px] text-cyan-300 font-bold">{agent.commissionRate}% per deposit</span>
        </div>
      </div>

      {/* Account Info Pill */}
      <div className="px-3 py-2 bg-[#1b123d] border-b border-[#2d1e5e] flex items-center justify-between text-[11px] text-gray-300">
        <div>
          <span className="text-gray-400">Your Bank/Telebirr:</span>{' '}
          <span className="font-bold text-white">{agent.bankName}</span>
        </div>
        <div>
          <span className="text-gray-400">Acc:</span>{' '}
          <span className="font-mono font-bold text-yellow-300">{agent.accountNumber}</span>
        </div>
      </div>

      {/* Action Bar: Direct Player Top-Up */}
      <div className="p-3 bg-[#160e33] flex items-center justify-between border-b border-[#251950]">
        <div>
          <h3 className="text-xs font-bold text-white">Manual Telegram Top-Up</h3>
          <p className="text-[10px] text-gray-400">Money sent to your account? Credit player immediately</p>
        </div>

        <button
          onClick={() => setShowDirectModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Top Up Player</span>
        </button>
      </div>

      {/* Tab Navigation for Agent */}
      <div className="flex border-b border-[#271b54] bg-[#160e33] px-2 pt-1 gap-1">
        <button
          onClick={() => setActiveTab('deposits')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition ${
            activeTab === 'deposits'
              ? 'bg-[#22164d] text-white border-t-2 border-orange-400 shadow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Deposits ({pendingRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition ${
            activeTab === 'withdrawals'
              ? 'bg-[#22164d] text-white border-t-2 border-green-400 shadow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-green-400" />
          <span>Withdrawals ({pendingWithdrawals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sms')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition ${
            activeTab === 'sms'
              ? 'bg-[#22164d] text-white border-t-2 border-emerald-400 shadow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>SMS Auto-Scan ({verifiedReceipts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition ${
            activeTab === 'assets'
              ? 'bg-[#22164d] text-white border-t-2 border-cyan-400 shadow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span>Company Assets ({companyAssets?.companyMoneyAsset?.toLocaleString() || 0} ETB)</span>
        </button>
      </div>

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* ================= DEPOSITS TAB ================= */}
        {activeTab === 'deposits' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-400" />
                <span>Incoming Player Deposits ({pendingRequests.length})</span>
              </h3>
              <span className="text-[10px] text-gray-400">Check your SMS / App first</span>
            </div>

            {/* Quick SMS Fast Scan & Auto-Verify Banner */}
            <div className="bg-gradient-to-r from-emerald-950/80 via-[#10241e] to-[#1a1238] p-3 rounded-2xl border border-emerald-500/40 mb-3 shadow-md">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-black text-white">Quick SMS Auto-Verifier (Telebirr & CBE)</span>
                </div>
                <span className="text-[9px] text-emerald-300 font-bold bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  Instant Match
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste Telebirr or CBE Birr SMS here to auto-approve..."
                  value={agentSmsInput}
                  onChange={(e) => setAgentSmsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleProcessAgentSms();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-[#0e1726] border border-emerald-500/40 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleProcessAgentSms()}
                  disabled={smsScanning || !agentSmsInput.trim()}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow transition active:scale-95 shrink-0 flex items-center gap-1"
                >
                  {smsScanning ? '...' : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>{smsScanning ? 'Checking' : 'Auto-Approve'}</span>
                </button>
              </div>
              {smsScanResult && (
                <div
                  className={`mt-2 p-2 rounded-xl text-xs font-bold animate-fade-in ${
                    smsScanResult.type === 'success'
                      ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/40'
                      : 'bg-red-900/60 text-red-200 border border-red-500/40'
                  }`}
                >
                  {smsScanResult.msg}
                </div>
              )}
            </div>

            {pendingRequests.length === 0 ? (
              <div className="bg-[#1b123d] rounded-2xl p-6 text-center border border-[#32226b] text-gray-400 text-xs">
                No pending player deposit requests right now.
                <p className="text-[10px] text-gray-500 mt-1">
                  When players choose to deposit via your agent account, they will appear here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-[#1e1445] p-3.5 rounded-2xl border border-yellow-500/30 flex flex-col gap-2.5 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-white">{req.username}</span>
                        <span className="text-[10px] text-gray-400 block">ID: #{req.userId}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-[#ffcc00]">{req.amount} ETB</span>
                        <span className="text-[9px] bg-yellow-500/20 text-yellow-300 font-bold px-2 py-0.5 rounded block mt-0.5">
                          PENDING
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#261a52] p-2.5 rounded-xl grid grid-cols-2 gap-1.5 text-[10px] text-gray-300">
                      <div>
                        <span className="text-gray-400">Provider:</span>{' '}
                        <span className="font-bold text-white uppercase">{req.provider}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Player Phone:</span>{' '}
                        <span className="font-mono text-white">{req.accountNumber || '--'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Ref Code:</span>{' '}
                        <span className="font-mono text-yellow-300 font-bold">{req.referenceCode}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#31226b] text-[10px]">
                      <span className="text-gray-400 font-mono">{req.createdAt}</span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRejectDeposit(req.id)}
                          className="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold rounded-xl border border-red-500/30 transition active:scale-95"
                        >
                          ውድቅ አድርግ (Reject)
                        </button>
                        <button
                          onClick={() => handleVerifyDeposit(req.id)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-black rounded-xl shadow-lg transition active:scale-95 flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>አረጋግጥና ጨምር (Top Up Balance)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recently Processed Top-Ups */}
            <div className="mt-4">
              <h3 className="text-xs font-bold text-gray-400 mb-2">Recently Completed Top-Ups</h3>
              {recentProcessed.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-[11px]">No recent top-ups completed</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {recentProcessed.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-[#170f36] p-2.5 rounded-xl border border-[#2b1b59] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{tx.username}</span>
                        <span className="text-[10px] text-gray-400 block">{tx.processedAt}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-green-400">+{tx.amount} ETB</span>
                        <span className="text-[9px] text-cyan-300 block">
                          +{Math.round(tx.amount * (agent.commissionRate / 100))} ETB Comm.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= WITHDRAWALS TAB ================= */}
        {activeTab === 'withdrawals' && (
          <div className="flex flex-col gap-3">
            {/* Quick Assets Header Banner */}
            <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#3b287d] grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#24194d] p-2 rounded-xl">
                <span className="text-[9px] text-gray-400 uppercase font-semibold block">Company Left Money Asset</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {companyAssets?.companyMoneyAsset?.toLocaleString() || 0} ETB
                </span>
              </div>
              <div className="bg-[#24194d] p-2 rounded-xl">
                <span className="text-[9px] text-gray-400 uppercase font-semibold block">Company Cut Retained (10%)</span>
                <span className="text-sm font-black text-orange-400 font-mono">
                  {companyAssets?.totalWithdrawalCuts?.toLocaleString() || 0} ETB
                </span>
              </div>
            </div>

            {/* Pending Withdrawal Queue */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span>Pending Withdrawals ({pendingWithdrawals.length})</span>
                </h3>
                <span className="text-[10px] text-yellow-300 font-bold">Send Net Payout to Player</span>
              </div>

              {pendingWithdrawals.length === 0 ? (
                <div className="bg-[#1b123d] rounded-2xl p-6 text-center border border-[#32226b] text-gray-400 text-xs">
                  No pending withdrawal requests assigned to you.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {pendingWithdrawals.map((req) => {
                    const cut = req.cutAmount !== undefined ? req.cutAmount : Math.round(req.amount * 0.10);
                    const netPayout = req.netPayout !== undefined ? req.netPayout : req.amount - cut;

                    return (
                      <div
                        key={req.id}
                        className="bg-[#1e1445] p-3.5 rounded-2xl border border-green-500/30 flex flex-col gap-2.5 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-black text-white">{req.fullName || req.username}</span>
                            <span className="text-[10px] text-gray-400 block">ID: #{req.userId} (@{req.username})</span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 block">Net Payout to Send:</span>
                            <span className="text-base font-black text-green-400 font-mono">{netPayout} ETB</span>
                          </div>
                        </div>

                        {/* Calculation Breakdown: Gross Amount, Cut Down, Net Payout */}
                        <div className="bg-[#261a52] p-2.5 rounded-xl grid grid-cols-3 gap-1.5 text-[10px] text-gray-300">
                          <div>
                            <span className="text-gray-400">Gross Amount:</span>{' '}
                            <span className="font-bold text-white font-mono">{req.amount} ETB</span>
                          </div>
                          <div>
                            <span className="text-orange-400">Cut (10%):</span>{' '}
                            <span className="font-bold text-orange-300 font-mono">-{cut} ETB</span>
                          </div>
                          <div>
                            <span className="text-green-400 font-bold">Net Payout:</span>{' '}
                            <span className="font-bold text-green-300 font-mono">{netPayout} ETB</span>
                          </div>

                          <div className="col-span-3 border-t border-[#382675] pt-1.5 grid grid-cols-2 gap-1">
                            <div>
                              <span className="text-gray-400">Bank/Method:</span>{' '}
                              <span className="font-bold text-white">{req.provider}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Recipient Account:</span>{' '}
                              <span className="font-mono text-yellow-300 font-bold">{req.accountNumber}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#31226b] text-[10px]">
                          <span className="text-gray-400 font-mono">Ref: {req.referenceCode}</span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRejectWithdrawal(req.id)}
                              className="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold rounded-xl border border-red-500/30 transition active:scale-95"
                            >
                              ውድቅ አድርግ (Reject)
                            </button>
                            <button
                              onClick={() => handleStartApproveWithdrawal(req)}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black rounded-xl shadow-lg transition active:scale-95 flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{netPayout} ETB ላክኩ (Mark Paid & Approve)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Complete Withdrawals Ledger Table */}
            <div className="mt-4">
              <h3 className="text-xs font-bold text-gray-300 mb-2">Withdrawals Ledger & History</h3>
              {allWithdrawals.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">No withdrawal history available</div>
              ) : (
                <div className="overflow-x-auto bg-[#1b123d] rounded-2xl border border-[#342470] p-1">
                  <table className="w-full text-left text-[10px] text-gray-300">
                    <thead className="bg-[#24194d] text-gray-400 uppercase text-[9px] border-b border-[#362675]">
                      <tr>
                        <th className="py-2 px-2">Ref / Date</th>
                        <th className="py-2 px-2">Player</th>
                        <th className="py-2 px-2">Status</th>
                        <th className="py-2 px-2 text-right">Gross</th>
                        <th className="py-2 px-2 text-right text-orange-400">Cut</th>
                        <th className="py-2 px-2 text-right text-yellow-400">Tx Fee</th>
                        <th className="py-2 px-2 text-right text-green-400">Actual Sent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a1b59]">
                      {allWithdrawals.map((w) => {
                        const cut = w.cutAmount !== undefined ? w.cutAmount : Math.round(w.amount * 0.10);
                        const net = w.netPayout !== undefined ? w.netPayout : w.amount - cut;
                        const actual = w.actualPaidAmount !== undefined ? w.actualPaidAmount : net;
                        return (
                          <tr key={w.id} className="hover:bg-[#201548]">
                            <td className="py-2 px-2">
                              <span className="font-mono text-yellow-300 font-bold block">{w.referenceCode || w.id.slice(-6)}</span>
                              <span className="text-[9px] text-gray-500">{w.createdAt}</span>
                            </td>
                            <td className="py-2 px-2">
                              <span className="text-white font-bold block">{w.fullName || w.username}</span>
                              <span className="text-[9px] text-gray-400">{w.provider} ({w.accountNumber})</span>
                            </td>
                            <td className="py-2 px-2">
                              <span
                                className={`px-2 py-0.5 rounded font-black uppercase text-[8px] ${
                                  w.status === 'approved'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : w.status === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {w.status === 'approved' ? 'Success' : w.status}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-white">{w.amount} ETB</td>
                            <td className="py-2 px-2 text-right font-mono text-orange-400">-{cut} ETB</td>
                            <td className="py-2 px-2 text-right font-mono text-yellow-400">
                              {w.transactionFee ? `-${w.transactionFee} ETB` : '0 ETB'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-green-400 font-black">+{actual} ETB</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= SMS AUTO-SCANNER & VERIFIER TAB ================= */}
        {activeTab === 'sms' && (
          <div className="flex flex-col gap-3">
            {/* Header / Intro */}
            <div className="bg-gradient-to-br from-[#132822] via-[#1a223f] to-[#120a2a] p-4 rounded-3xl border border-emerald-500/40 shadow-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">SMS Auto-Verifier & Fast-Match</h2>
                    <p className="text-[10px] text-emerald-300">
                      Telebirr & CBE Birr Instant Transaction Verification
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-900/60 border border-emerald-400/40 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  Anti-Fraud Protected
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed border-t border-emerald-500/20 pt-2">
                Paste any confirmation SMS from Telebirr (*127*...) or CBE. The system instantly parses the reference number, verifies the amount, and auto-credits the player's account in real-time.
              </p>
            </div>

            {/* Interactive SMS Scanner Box */}
            <div className="bg-[#1b123d] p-4 rounded-2xl border border-[#3b287d] shadow-md flex flex-col gap-3">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Paste Confirmation SMS Message Here:</span>
              </label>

              <textarea
                rows={4}
                value={agentSmsInput}
                onChange={(e) => setAgentSmsInput(e.target.value)}
                placeholder="Paste the SMS you received on your phone here (e.g. 'You have received 200 ETB from 0911... Trans. No: TB241116...' or 'Dear Customer, your account has been credited with ETB 500.00... Txn Id: FT2431...')"
                className="w-full p-3 bg-[#110a26] border border-[#3f2b87] rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-400 transition"
              />

              {/* Real-Time Live Parse Preview */}
              {(() => {
                const liveParsed = parseEthiopianSms(agentSmsInput);
                if (!agentSmsInput.trim()) return null;
                return (
                  <div className="bg-[#140c2e] p-3 rounded-xl border border-emerald-500/30 flex flex-col gap-1.5 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Live Extraction ({liveParsed.provider.toUpperCase()}):</span>
                      </span>
                      {liveParsed.referenceCode ? (
                        <span className="text-green-400 font-mono bg-green-950/60 px-2 py-0.5 rounded border border-green-500/40">
                          ✓ Ref: {liveParsed.referenceCode}
                        </span>
                      ) : (
                        <span className="text-yellow-400 text-[10px]">No Reference Code Found Yet</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300 pt-1 border-t border-[#2d1e5e]">
                      <div>
                        <span className="text-gray-400">Extracted Amount:</span>{' '}
                        <b className="text-yellow-300 font-mono">
                          {liveParsed.amount ? `${liveParsed.amount} ETB` : 'Not detected'}
                        </b>
                      </div>
                      <div>
                        <span className="text-gray-400">Sender Phone:</span>{' '}
                        <b className="text-white font-mono">{liveParsed.senderPhone || 'Not detected'}</b>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleProcessAgentSms()}
                  disabled={smsScanning || !agentSmsInput.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                >
                  {smsScanning ? (
                    <span>⏳ በመመርመር ላይ (Verifying SMS...)...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>⚡ Scan & Auto-Verify Deposit (አረጋግጥና ጨምር)</span>
                    </>
                  )}
                </button>
                {agentSmsInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setAgentSmsInput('');
                      setSmsScanResult(null);
                    }}
                    className="px-3 py-2.5 bg-[#251950] text-gray-400 hover:text-white rounded-xl text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {smsScanResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold animate-fade-in ${
                    smsScanResult.type === 'success'
                      ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/40'
                      : 'bg-red-900/60 text-red-200 border border-red-500/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {smsScanResult.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{smsScanResult.msg}</span>
                  </div>
                  {smsScanResult.data?.receipt && (
                    <div className="text-[10px] text-gray-300 font-mono mt-1">
                      Reference: {smsScanResult.data.receipt.referenceCode} • Amount: {smsScanResult.data.receipt.amount} ETB
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Automated Webhook Forwarder Section */}
            <div className="bg-[#160f33] p-3.5 rounded-2xl border border-[#2d1e5e] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                  <span>🤖</span>
                  <span>100% Automated SMS Forwarder (Android Webhook)</span>
                </span>
                <span className="text-[9px] bg-cyan-950 text-cyan-300 font-bold px-2 py-0.5 rounded border border-cyan-500/30">
                  Optional Hands-Free
                </span>
              </div>
              <p className="text-[10px] text-gray-300 leading-relaxed">
                You can forward incoming Telebirr/CBE SMS automatically from your Android phone using any free SMS Forwarder app.
              </p>

              <div className="bg-[#0e0822] p-2.5 rounded-xl border border-[#2a1a54] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] text-gray-400 block font-bold">Your Agent Webhook Endpoint URL:</span>
                  <span className="text-xs font-mono text-yellow-300 truncate block">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/agent/incoming-sms` : '/api/agent/incoming-sms'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/api/agent/incoming-sms`;
                    navigator.clipboard?.writeText(url);
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="px-2.5 py-1.5 bg-[#251950] hover:bg-[#342470] text-cyan-300 text-[10px] font-bold rounded-lg border border-cyan-500/30 transition shrink-0 flex items-center gap-1"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Copied!' : 'Copy URL'}</span>
                </button>
              </div>
            </div>

            {/* Verified Receipts History Table */}
            <div className="mt-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-300">
                  Recent Verified SMS Receipts ({verifiedReceipts.length})
                </h3>
                <button
                  onClick={() => fetchVerifiedReceipts(agent.id)}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {verifiedReceipts.length === 0 ? (
                <div className="text-center py-6 bg-[#1b123d] rounded-2xl border border-[#342470] text-gray-500 text-xs">
                  No verified receipts recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto bg-[#1b123d] rounded-2xl border border-[#342470] p-1">
                  <table className="w-full text-left text-[10px] text-gray-300">
                    <thead className="bg-[#24194d] text-gray-400 uppercase text-[9px] border-b border-[#362675]">
                      <tr>
                        <th className="py-2 px-2">Ref Code</th>
                        <th className="py-2 px-2">Provider</th>
                        <th className="py-2 px-2 text-right">Amount</th>
                        <th className="py-2 px-2 text-center">Status</th>
                        <th className="py-2 px-2">Recorded At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a1b59]">
                      {verifiedReceipts.map((rc) => (
                        <tr key={rc.id} className="hover:bg-[#201548]">
                          <td className="py-2 px-2">
                            <span className="font-mono text-yellow-300 font-bold block">{rc.referenceCode}</span>
                            {rc.matchedPlayer && (
                              <span className="text-[9px] text-gray-400">Player: @{rc.matchedPlayer}</span>
                            )}
                          </td>
                          <td className="py-2 px-2 uppercase font-bold text-white">{rc.provider}</td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-green-400">
                            {rc.amount ? `${rc.amount} ETB` : '--'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-black uppercase text-[8px] ${
                                rc.used
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {rc.used ? 'Matched & Paid' : 'Available'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-gray-500 font-mono text-[9px]">
                            {rc.receivedAt ? new Date(rc.receivedAt).toLocaleTimeString() : '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= COMPANY ASSETS TAB ================= */}
        {activeTab === 'assets' && (
          <div className="flex flex-col gap-3">
            {/* Header Asset Card */}
            <div className="bg-gradient-to-br from-[#1e1445] to-[#2b1766] p-4 rounded-3xl border border-[#482f91] shadow-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-cyan-300 uppercase font-bold tracking-wider block">
                    Bingo Company Treasury
                  </span>
                  <h2 className="text-2xl font-black text-white mt-0.5 font-mono">
                    {companyAssets?.companyMoneyAsset?.toLocaleString() || 0} <span className="text-xs text-gray-400">ETB</span>
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 text-lg">
                  🏛️
                </div>
              </div>
              <div className="text-[11px] text-gray-300 border-t border-[#3e277d] pt-2">
                Left money asset currently available for the Bingo Company across all operations.
              </div>
            </div>

            {/* 4 Financial Asset Metric Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#342470]">
                <span className="text-[9px] text-gray-400 uppercase font-semibold block">Total Deposits (Inflow)</span>
                <span className="text-base font-black text-white font-mono mt-0.5 block">
                  {companyAssets?.approvedDeposits?.toLocaleString() || 0} ETB
                </span>
                <span className="text-[9px] text-gray-500">Player capital</span>
              </div>

              <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#342470]">
                <span className="text-[9px] text-gray-400 uppercase font-semibold block">Withdrawals Paid (Success)</span>
                <span className="text-base font-black text-green-400 font-mono mt-0.5 block">
                  {companyAssets?.totalWithdrawalsNetPaid?.toLocaleString() || 0} ETB
                </span>
                <span className="text-[9px] text-gray-500">Net payouts sent</span>
              </div>

              <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#342470]">
                <span className="text-[9px] text-gray-400 uppercase font-semibold block">Withdrawal Cuts Kept</span>
                <span className="text-base font-black text-orange-400 font-mono mt-0.5 block">
                  {companyAssets?.totalWithdrawalCuts?.toLocaleString() || 0} ETB
                </span>
                <span className="text-[9px] text-orange-300/70">10% Company Cut</span>
              </div>

              <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#342470]">
                <span className="text-[9px] text-gray-400 uppercase font-semibold block">Game House Rake</span>
                <span className="text-base font-black text-yellow-300 font-mono mt-0.5 block">
                  {companyAssets?.totalGameHouseProfit?.toLocaleString() || 0} ETB
                </span>
                <span className="text-[9px] text-yellow-400/70">20% Game Rake</span>
              </div>
            </div>

            {/* Total Company Profit Banner */}
            <div className="bg-[#160f33] p-3 rounded-2xl border border-[#2d1e5e] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold">Total Company Revenue (Profit)</span>
                <span className="text-xs text-gray-500">Game Rake + Withdrawal Cuts</span>
              </div>
              <span className="text-lg font-black text-emerald-400 font-mono">
                {companyAssets?.totalCompanyProfit?.toLocaleString() || 0} ETB
              </span>
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL: Direct Player Top-Up --- */}
      {showDirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#1b123d] p-5 rounded-3xl border border-[#3b287d] shadow-2xl flex flex-col gap-3">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <Send className="w-4 h-4 text-green-400" />
              <span>Direct Player Top-Up</span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Credit player's wallet directly from your float balance ({agent.balance} ETB available).
            </p>

            <form onSubmit={handleDirectTopup} className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">
                  Player Username or User ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muktar_Ramadan or 429"
                  value={directPlayer}
                  onChange={(e) => setDirectPlayer(e.target.value)}
                  className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-1 focus:outline-none focus:border-green-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Amount (ETB)</label>
                <input
                  type="number"
                  required
                  min="10"
                  max={agent.balance}
                  value={directAmount}
                  onChange={(e) => setDirectAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-1 focus:outline-none focus:border-green-400"
                />
                <span className="text-[10px] text-cyan-300 mt-0.5 block">
                  You will earn {Math.round(parseInt(directAmount || 0) * (agent.commissionRate / 100))} ETB commission
                </span>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Remark / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Received 100 Birr via Telebirr"
                  value={directNote}
                  onChange={(e) => setDirectNote(e.target.value)}
                  className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-1"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowDirectModal(false)}
                  className="flex-1 py-2 bg-[#251950] text-gray-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white text-xs font-bold rounded-xl shadow"
                >
                  Send Top-Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Confirm Withdrawal Payout with Optional Transaction Fee */}
      {approvingWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#181038] rounded-3xl p-5 border border-[#3b287d] shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#2d1e5e] pb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>💸</span>
                <span>Confirm Payout (ገንዘብ መላክን ያረጋግጡ)</span>
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
                  value={txFee}
                  onChange={(e) => setTxFee(e.target.value)}
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
                    onClick={() => setTxFee(f)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition border ${
                      txFee === f
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
                      (parseFloat(txFee) || 0)
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
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
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
                onClick={handleConfirmApproval}
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
