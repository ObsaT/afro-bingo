import React, { useState } from 'react';
import {
  User,
  Shield,
  HelpCircle,
  Globe,
  Share2,
  Copy,
  Check,
  Send,
  Wallet,
  Plus,
  Headphones,
  Phone,
  Users,
} from 'lucide-react';

export default function ProfileModal({ user, supportSettings, onOpenAdmin, onOpenAgent, onOpenDeposit }) {
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState('en'); // 'en' | 'am'

  const support = supportSettings || {
    telegramUsername: 'afrobingo_support',
    phone: '+251911445566',
    supportGroup: 'https://t.me/afrobingo_support',
    title: 'Afro Bingo Customer Support',
    availableHours: '24/7 Live Support',
    notice: 'ያጋጠሞትን ማንኛውንም የክፍያ ወይም የጨዋታ ጥያቄ በቴሌግራም አነጋግሩን። (Contact our official support agent for instant assistance).',
  };
  const supportUser = (support.telegramUsername || 'afrobingo_support').replace(/^@/, '');

  const referralLink = `https://t.me/afrima_bingo_bot?start=ref_${user?.id || '1001'}`;

  const copyRef = () => {
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    const text = '🎉 ኑ አብረን Afro Bingo እንጫወት እና እናሸንፍ! (Play Afro Bingo with me and win big!) 🇪🇹💰';
    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(tgShareUrl);
    } else {
      window.open(tgShareUrl, '_blank');
    }
  };

  const mainWallet = Number(user?.mainWallet || 0);
  const playWallet = Number(user?.playWallet || 0);
  const totalBalance = (mainWallet + playWallet).toFixed(2);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 max-w-md mx-auto w-full">
      <h2 className="text-xl font-black text-white tracking-wide">Player Profile</h2>

      {/* Profile Header Card */}
      <div className="bg-[#1c133e] p-4 rounded-2xl border border-[#34246e] flex items-center gap-3 shadow-md">
        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-orange-500 to-yellow-400 flex items-center justify-center text-xl font-black text-white shadow-lg">
          {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
        </div>
        <div className="flex-1">
          <div className="text-base font-bold text-white flex items-center gap-1.5">
            <span>{user?.username || 'Afro Player'}</span>
            <span className="text-[10px] bg-green-500/20 text-green-400 font-semibold px-2 py-0.5 rounded-full border border-green-500/30">
              Verified
            </span>
          </div>
          <div className="text-xs text-gray-400 font-mono">Account ID: #{user?.id || '429'}</div>
        </div>
      </div>

      {/* Player Wallet Balance Card */}
      <div className="bg-gradient-to-br from-[#1e1346] to-[#28185c] p-4 rounded-2xl border border-[#442f8c] shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-yellow-400" />
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Wallet Balance</span>
          </div>
          <button
            onClick={onOpenDeposit}
            className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black rounded-lg transition flex items-center gap-1 shadow active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Deposit</span>
          </button>
        </div>

        {/* Total */}
        <div>
          <div className="text-2xl font-black text-white font-mono">{totalBalance} <span className="text-xs font-bold text-yellow-300">ETB</span></div>
          <div className="text-[10px] text-gray-400">Total combined account balance</div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#3c2a7a]">
          <div className="bg-[#160d33] p-2.5 rounded-xl border border-[#2e1d5a]">
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Main Wallet</span>
            <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
              {mainWallet.toFixed(2)} <span className="text-[10px] text-gray-400 font-normal">ETB</span>
            </div>
            <span className="text-[9px] text-gray-500">Withdrawals & Deposits</span>
          </div>

          <div className="bg-[#160d33] p-2.5 rounded-xl border border-[#2e1d5a]">
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Play Wallet</span>
            <div className="text-base font-black text-amber-300 font-mono mt-0.5">
              {playWallet.toFixed(2)} <span className="text-[10px] text-gray-400 font-normal">ETB</span>
            </div>
            <span className="text-[9px] text-gray-500">Cartela Game Stakes</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#32226b] text-center">
          <div className="text-xl font-black text-white">{user?.gamesPlayed ?? 0}</div>
          <div className="text-[10px] text-gray-400 uppercase font-semibold mt-0.5">Games Played</div>
        </div>
        <div className="bg-[#1b123d] p-3 rounded-2xl border border-[#32226b] text-center">
          <div className="text-xl font-black text-[#ffcc00]">{user?.gamesWon ?? 0}</div>
          <div className="text-[10px] text-gray-400 uppercase font-semibold mt-0.5">Bingo Wins</div>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="bg-[#1b123d] p-4 rounded-2xl border border-[#32226b] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">Language / ቋንቋ</span>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-[#3c2980]">
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-xs font-bold ${
              lang === 'en' ? 'bg-[#3b82f6] text-white' : 'bg-[#24194d] text-gray-400'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang('am')}
            className={`px-3 py-1 text-xs font-bold ${
              lang === 'am' ? 'bg-[#3b82f6] text-white' : 'bg-[#24194d] text-gray-400'
            }`}
          >
            አማርኛ
          </button>
        </div>
      </div>

      {/* Referral Program */}
      <div className="bg-[#1b123d] p-4 rounded-2xl border border-[#32226b] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-white">Invite Friends & Earn Bonus</span>
          </div>
          <span className="text-[10px] bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
            +10 ETB
          </span>
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Get 10 ETB bonus for every friend who joins using your link and plays!
        </p>

        {/* Link Box */}
        <div className="flex items-center gap-2 bg-[#251950] p-2.5 rounded-xl border border-[#3c2980]">
          <span className="text-xs text-cyan-300 font-mono truncate flex-1">{referralLink}</span>
          <button
            onClick={copyRef}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#372674] hover:bg-[#473295] rounded-lg text-xs font-bold text-white transition active:scale-95 shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Direct Telegram Share Button */}
        <button
          onClick={handleShareTelegram}
          className="w-full py-2.5 bg-gradient-to-r from-[#229ed9] to-[#0088cc] hover:from-[#1d8bc0] hover:to-[#0077b5] text-white text-xs font-black rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Share Link on Telegram (በቴሌግራም አጋራ)</span>
        </button>
      </div>

      {/* 24/7 Official Customer Support Card */}
      <div className="bg-gradient-to-br from-[#17254d] to-[#12193b] p-4 rounded-2xl border border-cyan-400/40 flex flex-col gap-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-inner">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span>{support?.title || 'Customer Support'}</span>
                <span className="text-[9px] bg-green-500/20 text-green-400 font-bold px-1.5 py-0.5 rounded-full border border-green-500/30">
                  {support?.availableHours || '24/7'}
                </span>
              </div>
              <div className="text-[11px] text-cyan-300 font-mono font-bold">
                @{supportUser}
              </div>
            </div>
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
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Chat</span>
          </a>
        </div>

        {support?.notice && (
          <p className="text-[11px] text-gray-300 leading-relaxed bg-[#0d142b]/80 p-2.5 rounded-xl border border-cyan-900/50">
            {support.notice}
          </p>
        )}

        <div className="flex items-center gap-2 pt-0.5">
          {support?.phone && (
            <a
              href={`tel:${support.phone}`}
              className="flex-1 py-1.5 px-2 bg-[#1b2649] hover:bg-[#253566] rounded-xl text-center text-[11px] font-bold text-gray-200 border border-cyan-500/30 transition flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-cyan-400" />
              <span>{support.phone}</span>
            </a>
          )}

          {support?.supportGroup && (
            <a
              href={support.supportGroup}
              onClick={(e) => {
                if (window.Telegram?.WebApp?.openTelegramLink) {
                  e.preventDefault();
                  window.Telegram.WebApp.openTelegramLink(support.supportGroup);
                }
              }}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-1.5 px-2 bg-[#1b2649] hover:bg-[#253566] rounded-xl text-center text-[11px] font-bold text-gray-200 border border-cyan-500/30 transition flex items-center justify-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Group</span>
            </a>
          )}
        </div>
      </div>

      {/* Rules & Fair Play */}
      <div className="bg-[#1b123d] p-4 rounded-2xl border border-[#32226b] flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-xs font-bold text-white">Provably Fair & Secure</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Afro Bingo operates with deterministic 75-ball standard algorithmic random number generation (RNG).
          Every ball drawn is verified instantly across all player boards simultaneously.
        </p>
      </div>
    </div>
  );
}
