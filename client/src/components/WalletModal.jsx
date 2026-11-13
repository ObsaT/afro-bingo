import React, { useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  Users,
} from 'lucide-react';
import BankDepositModal from './deposit/BankDepositModal';
import BankWithdrawalModal from './deposit/BankWithdrawalModal';

export default function WalletModal({
  user,
  bonusSettings,
  supportSettings,
  onDeposit,
  onTransfer,
  onWithdraw,
  onClose,
}) {
  const [walletTab, setWalletTab] = useState('deposit'); // 'deposit' | 'withdrawal' | 'transfer' | 'invite'
  const [transferAmount, setTransferAmount] = useState('50');
  const [direction, setDirection] = useState('main_to_play');
  const [feedback, setFeedback] = useState(null);
  const [copied, setCopied] = useState(false);

  const supportUser = (supportSettings?.telegramUsername || 'afrobingo_support').replace(/^@/, '');

  const inviteLink = `https://t.me/afrima_bingo_bot?start=ref_${user?.id || ''}`;
  const inviterPlay = bonusSettings?.invitation?.inviterPlayAmount ?? 20;
  const inviterAcc = bonusSettings?.invitation?.inviterAccAmount ?? 5;
  const friendPlay = (bonusSettings?.firstJoin?.playAmount ?? 50) + (bonusSettings?.invitation?.friendPlayAmount ?? 15);
  const friendAcc = (bonusSettings?.firstJoin?.accAmount ?? 0) + (bonusSettings?.invitation?.friendAccAmount ?? 0);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {}
  };

  const handleShare = () => {
    const text = '🎮 ኑ አብረን በአፍሮ ቢንጎ (AFRO BINGO) እንጫወት እና እናሸንፍ! ተመዝግበው የቦነስ ስጦታዎን ይቀበሉ! 🇪🇹🔥';
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const handleTransfer = async () => {
    const res = await onTransfer(parseInt(transferAmount), direction);
    if (res.success) {
      setFeedback('Transfer completed successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback(res.error || 'Transfer failed');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#120a2e] text-white overflow-hidden">
      {/* Wallet Mode Selector Tabs */}
      <div className="flex items-center bg-[#1a1138] border-b border-[#2d1f59] p-2 gap-1.5 shrink-0 z-30">
        <button
          onClick={() => setWalletTab('deposit')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            walletTab === 'deposit'
              ? 'bg-[#2e5b3c] text-white shadow-md'
              : 'text-gray-400 hover:text-white bg-[#22164a]'
          }`}
        >
          <span>🏦</span>
          <span>DEPOSIT</span>
        </button>

        <button
          onClick={() => setWalletTab('withdrawal')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            walletTab === 'withdrawal'
              ? 'bg-[#821f57] text-white shadow-md'
              : 'text-gray-400 hover:text-white bg-[#22164a]'
          }`}
        >
          <span>💸</span>
          <span>WITHDRAWAL</span>
        </button>

        <button
          onClick={() => setWalletTab('transfer')}
          className={`px-3 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 ${
            walletTab === 'transfer'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white bg-[#22164a]'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>TRANSFER</span>
        </button>

        <button
          onClick={() => setWalletTab('invite')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            walletTab === 'invite'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white bg-[#22164a]'
          }`}
        >
          <span>🎁</span>
          <span>INVITE</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {walletTab === 'deposit' && (
          <BankDepositModal
            user={user}
            onClose={onClose}
            onSuccess={() => {
              setFeedback('Deposit submitted! Agent will credit your balance.');
            }}
          />
        )}

        {walletTab === 'withdrawal' && (
          <BankWithdrawalModal
            user={user}
            onWithdraw={onWithdraw}
            onClose={onClose}
          />
        )}

        {walletTab === 'transfer' && (
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 max-w-md mx-auto w-full">
            <h2 className="text-xl font-black text-white tracking-wide">Wallet Balance & Transfer</h2>

            {feedback && (
              <div className="p-3 bg-green-500/20 border border-green-500/40 rounded-xl flex items-center gap-2 text-green-300 text-xs font-semibold animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{feedback}</span>
              </div>
            )}

            {/* Balances Card */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1e1442] p-3 rounded-2xl border border-[#3b287d] shadow-md">
                <span className="text-[11px] text-gray-400 font-semibold uppercase">Main Wallet</span>
                <div className="text-2xl font-black text-white mt-1">
                  {user?.mainWallet ?? 0} <span className="text-xs font-normal text-gray-400">ETB</span>
                </div>
                <span className="text-[10px] text-gray-500">Withdrawals & Deposits</span>
              </div>

              <div className="bg-[#1e1442] p-3 rounded-2xl border border-[#3b287d] shadow-md">
                <span className="text-[11px] text-gray-400 font-semibold uppercase">Play Wallet</span>
                <div className="text-2xl font-black text-[#ffcc00] mt-1">
                  {user?.playWallet ?? 0} <span className="text-xs font-normal text-gray-400">ETB</span>
                </div>
                <span className="text-[10px] text-gray-500">Used for Cartela Stakes</span>
              </div>
            </div>

            {/* Quick Transfer between Wallets */}
            <div className="bg-[#1b123d] p-4 rounded-2xl border border-[#32226b] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                  <span>Transfer Balance</span>
                </h3>
                <span className="text-[10px] text-gray-400">Instant & Fee-free</span>
              </div>

              <div className="flex rounded-xl overflow-hidden border border-[#3c2980]">
                <button
                  onClick={() => setDirection('main_to_play')}
                  className={`flex-1 py-1.5 text-xs font-bold transition ${
                    direction === 'main_to_play' ? 'bg-[#3b82f6] text-white' : 'bg-[#24194d] text-gray-400'
                  }`}
                >
                  Main ➔ Play
                </button>
                <button
                  onClick={() => setDirection('play_to_main')}
                  className={`flex-1 py-1.5 text-xs font-bold transition ${
                    direction === 'play_to_main' ? 'bg-[#3b82f6] text-white' : 'bg-[#24194d] text-gray-400'
                  }`}
                >
                  Play ➔ Main
                </button>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Amount (ETB)</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#251950] border border-[#3c2980] rounded-xl text-xs text-white mt-1 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-2">
                {['10', '50', '100', '250', '500'].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTransferAmount(amt)}
                    className="flex-1 py-1 bg-[#251950] hover:bg-[#342370] text-gray-300 rounded-lg text-xs font-semibold border border-[#372674]"
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <button
                onClick={handleTransfer}
                className="w-full py-2.5 bg-[#f05a28] hover:bg-[#ff6838] text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        )}

        {walletTab === 'invite' && (
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3.5 max-w-md mx-auto w-full">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎁</span>
              <div>
                <h2 className="text-lg font-black text-white tracking-wide">
                  Invite & Earn (ይጋብዙ ያግኙ)
                </h2>
                <p className="text-[11px] text-gray-400">
                  Earn cash in Main Account (Acc) and game bonus in Play Account for every friend!
                </p>
              </div>
            </div>

            {/* Referral Link Box */}
            <div className="bg-[#1b123d] p-3 rounded-2xl border border-yellow-500/40 shadow-lg flex flex-col gap-2">
              <span className="text-[10px] text-yellow-300 font-bold uppercase tracking-wider">
                የእርስዎ ልዩ የመጋበዣ ሊንክ (Your Referral Link)
              </span>
              <div className="p-2 bg-[#120a2e] rounded-xl border border-[#3b287d] text-xs font-mono text-cyan-300 break-all select-all">
                {inviteLink}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={handleCopy}
                  className="py-2 px-3 bg-[#2a1d5c] hover:bg-[#38277a] text-white text-xs font-bold rounded-xl border border-[#432e8c] flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-yellow-400" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleShare}
                  className="py-2 px-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold rounded-xl shadow flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Telegram</span>
                </button>
              </div>
            </div>

            {/* Referral Rates & Rewards Card */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Inviter Earns */}
              <div className="bg-[#1d1344] p-3 rounded-2xl border border-[#392676] flex flex-col gap-1.5 shadow">
                <div className="flex items-center gap-1 text-[10px] text-yellow-300 font-black uppercase tracking-wider">
                  <span>👤</span>
                  <span>You Earn</span>
                </div>
                <div className="text-[10px] text-gray-400">Per invited friend:</div>
                <div className="bg-[#150d33] p-1.5 rounded-lg border border-[#302066] flex flex-col gap-1 mt-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-medium">🎮 Play Acc:</span>
                    <strong className="text-yellow-300 font-mono">+{inviterPlay} ETB</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-medium">💳 Main Acc:</span>
                    <strong className="text-emerald-400 font-mono">+{inviterAcc} ETB</strong>
                  </div>
                </div>
              </div>

              {/* Friend Earns */}
              <div className="bg-[#1d1344] p-3 rounded-2xl border border-[#392676] flex flex-col gap-1.5 shadow">
                <div className="flex items-center gap-1 text-[10px] text-cyan-300 font-black uppercase tracking-wider">
                  <span>👥</span>
                  <span>Friend Earns</span>
                </div>
                <div className="text-[10px] text-gray-400">Welcome bonus:</div>
                <div className="bg-[#150d33] p-1.5 rounded-lg border border-[#302066] flex flex-col gap-1 mt-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-medium">🎮 Play Acc:</span>
                    <strong className="text-cyan-300 font-mono">+{friendPlay} ETB</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-medium">💳 Main Acc:</span>
                    <strong className="text-emerald-400 font-mono">+{friendAcc} ETB</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Friends Invited Stats */}
            <div className="bg-[#19103c] p-3 rounded-2xl border border-[#322168] flex items-center justify-between shadow">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-400" />
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">
                    የጋበዟቸው ጓደኞች (Friends Invited)
                  </span>
                  <span className="text-sm font-black text-white font-mono">
                    {user?.referralsCount || 0} ሰዎች
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block font-semibold">Status</span>
                <span className="text-xs font-bold text-emerald-400">Active</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Support Banner Footer */}
      <div className="bg-[#110926] border-t border-[#25184a] px-4 py-2.5 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1.5 text-gray-300">
          <span className="text-cyan-400">🎧</span>
          <span className="text-[11px]">Need payment help?</span>
        </div>
        <a
          href={`https://t.me/${supportUser}`}
          onClick={(e) => {
            if (window.Telegram?.WebApp?.openTelegramLink) {
              e.preventDefault();
              window.Telegram.WebApp.openTelegramLink(`https://t.me/${supportUser}`);
            }
          }}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition active:scale-95"
        >
          <span>Support (@{supportUser})</span>
          <span>→</span>
        </a>
      </div>
    </div>
  );
}
