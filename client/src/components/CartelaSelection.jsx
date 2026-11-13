import React, { useState } from 'react';
import { Wallet, Plus, AlertCircle } from 'lucide-react';
import { playClickSound } from '../utils/audio';

export default function CartelaSelection({
  user,
  takenCartelas = [],
  myCartelas = [],
  onSelectCartela,
  stake = 10,
  derash = 0,
  playersCount = 0,
  houseCutPercent = 20,
  maxCartelasPerPlayer = 3,
  totalCartelas = 100,
  onOpenDeposit,
}) {
  const [warningMsg, setWarningMsg] = useState(null);

  const playWallet = Number(user?.playWallet ?? 0);
  const mainWallet = Number(user?.mainWallet ?? 0);
  const totalBalance = playWallet + mainWallet;
  const isTaken = (num) => takenCartelas.includes(num);
  const isMine = (num) => myCartelas.some((c) => c.id === num);

  // Derash / Possible Win calculations based on Ethiopian bingo standard (Melbet model)
  const totalCardsTaken = Math.max(takenCartelas.length, myCartelas.length, playersCount);
  const grossPool = totalCardsTaken * stake;
  const netPercent = 100 - (houseCutPercent || 20);
  const possibleWin = derash > 0 ? derash : Math.floor((grossPool > 0 ? grossPool : stake) * (netPercent / 100));

  const handleCardClick = (num) => {
    const mine = isMine(num);
    const taken = isTaken(num);

    if (taken && !mine) return;

    if (!mine && myCartelas.length >= maxCartelasPerPlayer) {
      setWarningMsg(
        `⚠️ Maximum ${maxCartelasPerPlayer} cartela${
          maxCartelasPerPlayer > 1 ? 's' : ''
        } allowed per player! Tap your card to deselect.`
      );
      setTimeout(() => setWarningMsg(null), 3000);
      return;
    }

    if (!mine && totalBalance < stake) {
      setWarningMsg(
        `⚠️ Insufficient Balance (${totalBalance.toFixed(2)} ETB). Cartela stake is ${stake} ETB. Please top up your wallet!`
      );
      setTimeout(() => setWarningMsg(null), 3500);
      return;
    }

    playClickSound();
    onSelectCartela(num);
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 py-1 flex flex-col items-center">
      {/* Player Balance Bar */}
      <div className="w-full max-w-md mb-2 px-3 py-2 bg-[#1b123d] rounded-xl border border-[#372675] flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-yellow-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Balance</span>
            <span className="text-sm font-black text-yellow-300 font-mono">{totalBalance.toFixed(2)} ETB</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Stake</span>
            <div className="text-xs font-bold text-white font-mono">{stake} ETB / card</div>
          </div>

          <button
            onClick={onOpenDeposit}
            className="px-2.5 py-1 bg-[#2e5b3c] hover:bg-[#38704a] text-white text-xs font-bold rounded-lg transition flex items-center gap-1 active:scale-95 shadow"
            title="Deposit funds"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Deposit</span>
          </button>
        </div>
      </div>

      {/* Melbet Ethiopia-style "Possible Win & Percent Cut" Banner */}
      <div className="w-full max-w-md mb-2 p-2.5 bg-gradient-to-r from-[#21164a] via-[#2d1b5e] to-[#21164a] rounded-2xl border border-yellow-500/40 shadow-lg flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-lg shadow-sm">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-300 font-extrabold uppercase tracking-wider">
                  የሚገኝ ድራሽ (Possible Win)
                </span>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black rounded-md">
                  {netPercent}% Net
                </span>
              </div>
              <div className="text-lg font-black text-yellow-300 font-mono tracking-tight leading-none mt-0.5">
                {possibleWin} <span className="text-xs text-yellow-400 font-bold">ETB</span>
              </div>
            </div>
          </div>

          <div className="text-right bg-[#150d30] px-2.5 py-1 rounded-xl border border-[#3b277d]">
            <span className="text-[9px] text-gray-400 uppercase font-semibold block">House Cut</span>
            <span className="text-xs font-black text-orange-400 font-mono">
              -{houseCutPercent || 20}% <span className="text-[9px] text-gray-400 font-normal">ቅናሽ</span>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-300 border-t border-[#372674]/80 pt-1.5 px-0.5 font-medium">
          <span>Gross Pool: <strong className="text-white font-mono">{grossPool > 0 ? grossPool : stake} ETB</strong></span>
          <span>Joined: <strong className="text-cyan-300 font-mono">{totalCardsTaken} Cards</strong></span>
          <span>Your Stake: <strong className="text-yellow-300 font-mono">{myCartelas.length * stake} ETB</strong></span>
        </div>
      </div>

      {warningMsg && (
        <div className="w-full max-w-md mb-2 p-2 bg-orange-500/20 border border-orange-500/40 rounded-xl text-orange-300 text-xs text-center font-bold animate-bounce flex items-center justify-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-orange-400" />
          <span>{warningMsg}</span>
        </div>
      )}

      {/* 100 Cartelas Grid (8-column layout matching Ethiopian bingo) */}
      <div className="w-full max-w-md bg-[#191136] p-2 rounded-2xl border border-[#2d205c] shadow-2xl">
        <div className="grid grid-cols-8 gap-1.5 p-0.5">
          {Array.from({ length: totalCartelas || 100 }, (_, i) => i + 1).map((num) => {
            const mine = isMine(num);
            const taken = isTaken(num);

            let bgClass = 'bg-[#292d47] hover:bg-[#353a5b] text-white border-[#373c61]';
            if (mine) {
              // User's own selected cartela: vibrant orange with glowing yellow ring
              bgClass =
                'bg-[#f05a28] text-white font-black ring-2 ring-yellow-300 ring-offset-1 ring-offset-[#191136] shadow-md shadow-orange-500/50 scale-105 z-10 border-transparent';
            } else if (taken) {
              // Taken by other players: solid brick-orange as seen in screenshots
              bgClass = 'bg-[#d04924] text-white font-bold border-[#b53a1a]';
            }

            return (
              <button
                key={num}
                onClick={() => handleCardClick(num)}
                disabled={taken && !mine}
                className={`h-9 sm:h-10 flex items-center justify-center rounded-lg text-xs md:text-sm font-bold transition-all duration-150 active:scale-90 border ${bgClass}`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cartela Legend / Summary */}
      <div className="w-full max-w-md mt-2 px-3 py-1.5 bg-[#201545]/80 rounded-xl border border-[#35256e] flex items-center justify-around text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-[#292d47] border border-[#373c61]"></div>
          <span className="text-gray-300">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-[#d04924]"></div>
          <span className="text-gray-300">Taken</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-[#f05a28] ring-2 ring-yellow-300"></div>
          <span className="text-yellow-300 font-bold">
            Your Card ({myCartelas.length}/{maxCartelasPerPlayer})
          </span>
        </div>
      </div>
    </div>
  );
}
