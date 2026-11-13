import React, { useState } from 'react';
import {
  X,
  ChevronDown,
  MoreVertical,
  ChevronLeft,
  RotateCcw,
  Shield,
  Users,
  Wallet,
  Plus,
  ArrowLeftRight,
  ExternalLink,
  Headphones,
} from 'lucide-react';

export default function Header({
  title = 'AFRO BINGO',
  user = null,
  mainWallet = 0,
  playWallet = 0,
  stake = 10,
  countdown = null,
  showStats = true,
  onBack,
  onRefresh,
  onOpenDeposit,
  onOpenWithdrawal,
  onOpenAdmin,
  onOpenAgent,
  supportSettings = null,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showBalanceDropdown, setShowBalanceDropdown] = useState(false);

  const supportUser = (supportSettings?.telegramUsername || 'afrobingo_support').replace(/^@/, '');

  const totalBalance = (Number(mainWallet || 0) + Number(playWallet || 0)).toFixed(2);

  return (
    <header className="w-full bg-[#130d29] border-b border-[#241a4a] sticky top-0 z-40 select-none">
      {/* Top Bar matching Melbet Screenshot 1 & 4 */}
      <div className="flex items-center justify-between px-3 py-2 text-gray-200 relative">
        {/* Left: Close/Back & Brand Title */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.close();
              } else if (onBack) {
                onBack();
              }
            }}
            className="p-1 hover:bg-[#251b4e] rounded-lg transition"
            title="Close / Back"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>

          <div className="flex items-center gap-1 cursor-pointer">
            <span className="font-extrabold tracking-wider text-base text-white drop-shadow-sm">
              {title}
            </span>
          </div>
        </div>

        {/* Right: Melbet-Style Player Wallet Balance Pill [ 0.87 ETB (+) ] + Menu */}
        <div className="flex items-center gap-1.5">
          {/* Balance Pill */}
          <div className="flex items-center bg-[#1d143d] border border-[#3c2a7f] rounded-xl p-0.5 shadow-sm relative">
            <button
              onClick={() => setShowBalanceDropdown(!showBalanceDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-black text-white hover:text-yellow-300 transition"
              title="Click to view Main & Play wallet breakdown"
            >
              <Wallet className="w-3.5 h-3.5 text-yellow-400" />
              <span className="font-mono">{totalBalance} ETB</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {/* Quick Top-Up Plus (+) Button */}
            <button
              onClick={() => {
                if (onOpenDeposit) onOpenDeposit();
              }}
              className="w-6 h-6 rounded-lg bg-gradient-to-r from-yellow-400 to-[#f05a28] hover:from-yellow-300 hover:to-[#ff6838] text-white font-black text-sm flex items-center justify-center transition active:scale-95 shadow"
              title="Deposit / Top-up Balance"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Menu button (Admin/Agent) */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            title="Menu"
            className="p-1.5 hover:bg-[#251b4e] rounded-lg transition text-gray-300 hover:text-white"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Floating Balance Details Modal */}
        {showBalanceDropdown && (
          <div className="absolute right-3 top-12 bg-[#1b123d] border border-[#3e2c84] rounded-2xl shadow-2xl p-3 flex flex-col gap-2.5 z-50 min-w-[240px] animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-[#2d205c] pb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Account ID: <b className="text-white font-mono">#{user?.id || 'Player'}</b>
              </span>
              <button
                onClick={() => setShowBalanceDropdown(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {/* Total Balance */}
            <div className="bg-[#24194d] p-2.5 rounded-xl border border-[#3b2a75]">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Total Balance</div>
              <div className="text-xl font-black text-white mt-0.5 font-mono">{totalBalance} ETB</div>
            </div>

            {/* Wallets Breakdown */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#170e33] p-2 rounded-xl border border-[#2d1e57]">
                <div className="text-[9px] text-gray-400 uppercase font-bold">Main Wallet</div>
                <div className="text-sm font-black text-green-400 font-mono mt-0.5">
                  {Number(mainWallet || 0).toFixed(2)}
                </div>
                <div className="text-[9px] text-gray-500">Withdraw / In</div>
              </div>

              <div className="bg-[#170e33] p-2 rounded-xl border border-[#2d1e57]">
                <div className="text-[9px] text-gray-400 uppercase font-bold">Play Wallet</div>
                <div className="text-sm font-black text-yellow-300 font-mono mt-0.5">
                  {Number(playWallet || 0).toFixed(2)}
                </div>
                <div className="text-[9px] text-gray-500">Game Stakes</div>
              </div>
            </div>

            {/* Actions: Deposit & Withdraw */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => {
                  setShowBalanceDropdown(false);
                  if (onOpenDeposit) onOpenDeposit();
                }}
                className="flex-1 py-1.5 bg-[#2e5b3c] hover:bg-[#38704a] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95"
              >
                <span>+</span>
                <span>Deposit</span>
              </button>

              <button
                onClick={() => {
                  setShowBalanceDropdown(false);
                  if (onOpenWithdrawal) onOpenWithdrawal();
                }}
                className="flex-1 py-1.5 bg-[#821f57] hover:bg-[#992566] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95"
              >
                <span>💸</span>
                <span>Withdraw</span>
              </button>
            </div>
          </div>
        )}

        {/* Dropdown Menu for Admin & Agent */}
        {showMenu && (
          <div className="absolute right-3 top-12 bg-[#1e1442] border border-[#3c2980] rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 z-50 min-w-[160px] animate-fade-in">
            <button
              onClick={() => {
                setShowMenu(false);
                if (onOpenAdmin) onOpenAdmin();
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-[#2b1c60] rounded-xl text-xs font-bold text-yellow-400 text-left transition"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Portal</span>
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                if (onOpenAgent) onOpenAgent();
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-[#2b1c60] rounded-xl text-xs font-bold text-cyan-400 text-left transition"
            >
              <Users className="w-4 h-4" />
              <span>Agent Portal</span>
            </button>
            <a
              href={`https://t.me/${supportUser}`}
              onClick={(e) => {
                setShowMenu(false);
                if (window.Telegram?.WebApp?.openTelegramLink) {
                  e.preventDefault();
                  window.Telegram.WebApp.openTelegramLink(`https://t.me/${supportUser}`);
                }
              }}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 hover:bg-[#2b1c60] rounded-xl text-xs font-bold text-emerald-400 text-left transition"
            >
              <Headphones className="w-4 h-4" />
              <span>Customer Support</span>
            </a>
          </div>
        )}
      </div>

      {/* Subheader: Back & Refresh & Stats */}
      {showStats && (
        <div className="px-3 pb-2 pt-1 flex flex-col gap-2">
          {/* Action Row */}
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#251952] hover:bg-[#32226e] text-white text-xs font-semibold rounded-lg shadow-sm border border-[#3b287d] transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#251952] hover:bg-[#32226e] text-white text-xs font-semibold rounded-lg shadow-sm border border-[#3b287d] transition active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Stats Badges Row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[#24194d] rounded-lg p-1.5 text-center border border-[#372674]/50 shadow-inner">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Main Wallet</div>
              <div className="text-sm font-bold text-green-400 mt-0.5">{Number(mainWallet || 0).toFixed(2)}</div>
            </div>

            <div className="bg-[#24194d] rounded-lg p-1.5 text-center border border-[#372674]/50 shadow-inner">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Play Wallet</div>
              <div className="text-sm font-bold text-yellow-300 mt-0.5">{Number(playWallet || 0).toFixed(2)}</div>
            </div>

            <div className="bg-[#24194d] rounded-lg p-1.5 text-center border border-[#372674]/50 shadow-inner">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Stake</div>
              <div className="text-sm font-bold text-white mt-0.5">{stake}</div>
            </div>

            <div className="bg-[#24194d] rounded-lg p-1.5 text-center border border-[#372674]/50 shadow-inner flex flex-col justify-center items-center">
              <div className="text-sm font-black text-[#ffcc00] animate-pulse">
                {countdown !== null ? `${countdown} s` : '--'}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
