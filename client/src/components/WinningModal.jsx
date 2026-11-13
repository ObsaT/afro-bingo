import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Star, Crown } from 'lucide-react';
import { playBingoFanfare, announceBingo } from '../utils/audio';

export default function WinningModal({
  winners = [],
  prizePerWinner = 0,
  derash = 0,
  allCalledNumbers = [],
  nextRoundIn = 6,
  voiceLanguage = 'am',
  voiceGender = 'female',
  user = null,
  myCartelas = [],
  stake = 10,
}) {
  const [countdown, setCountdown] = useState(nextRoundIn);

  const myCartelaIds = new Set((myCartelas || []).map((c) => c.id));
  const myWinningCartela = (winners || []).find(
    (w) => (user?.id && String(w.userId) === String(user.id)) || myCartelaIds.has(w.cartelaId)
  );
  const isWinner = Boolean(myWinningCartela);
  const didPlay = (myCartelas || []).length > 0;

  useEffect(() => {
    // 1. Announcer calls out "BINGO!"
    announceBingo(voiceLanguage, voiceGender);

    // 2. Sound & Confetti blast
    playBingoFanfare();
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
    });

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [nextRoundIn]);

  const primaryWinner = winners.length > 0 ? winners[0] : null;
  const winningCellsSet = new Set();
  if (primaryWinner && primaryWinner.winningCells) {
    primaryWinner.winningCells.forEach((c) => {
      winningCellsSet.add(`${c.row}-${c.col}`);
    });
  }

  const calledSet = new Set(allCalledNumbers);

  const colColors = {
    B: 'bg-[#3b82f6]',
    I: 'bg-[#8b5cf6]',
    N: 'bg-[#d946ef]',
    G: 'bg-[#10b981]',
    O: 'bg-[#f97316]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-[#16102e] rounded-3xl p-5 border border-[#3b287d] shadow-2xl flex flex-col items-center text-center">
        {/* Crown & Bingo Header */}
        <div className="text-3xl mb-1 filter drop-shadow animate-bounce">
          👑
        </div>
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-200 tracking-wider">
          🎉 BINGO! 🎉
        </h2>
        <div className="text-xs font-extrabold text-[#ffcc00] mt-1 tracking-wide flex items-center gap-1">
          <span>🏆</span>
          <span>{winners.length} {winners.length === 1 ? 'PLAYER' : 'PLAYERS'} WON!</span>
        </div>
        {prizePerWinner > 0 && (
          <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
            Payable: <strong className="font-mono text-yellow-300 font-bold">{prizePerWinner} ETB</strong> each (Derash: {derash} ETB)
          </div>
        )}

        {/* Player Personal Outcome Notice */}
        {didPlay && isWinner && (
          <div className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-white font-black text-xs shadow-lg animate-pulse border border-green-300 flex flex-col items-center gap-0.5">
            <div>🎉 እንኳን ደስ አለዎት! አሸንፈዋል (Won)!</div>
            <div className="text-yellow-200 font-mono text-sm font-black">
              የሚከፈል (Payable): +{myWinningCartela?.payableAmount || prizePerWinner} ETB
            </div>
          </div>
        )}

        {didPlay && !isWinner && (
          <div className="w-full mt-2 py-1.5 px-3 rounded-xl bg-red-950/80 text-red-200 font-bold text-xs border border-red-500/50 shadow">
            ❌ በዚህ ዙር አልደረሰዎትም (-{(myCartelas || []).length * stake} ETB ተቀናሽ ሆኗል)
          </div>
        )}

        {/* Winners List Cards with Payable Amount */}
        <div className="w-full grid grid-cols-2 gap-2 my-3 max-h-32 overflow-y-auto">
          {winners.map((w, idx) => {
            const payable = w.payableAmount || prizePerWinner || (derash && winners.length ? Math.floor(derash / winners.length) : 0);
            return (
              <div
                key={idx}
                className="bg-[#24194c] p-2 rounded-xl border border-[#372674] flex flex-col items-center shadow-sm"
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs">👑</span>
                  <span className="text-xs font-bold text-white truncate max-w-[100px]">
                    {w.username}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-semibold">
                  Cartela #{w.cartelaId}
                </span>
                <div className="mt-1 px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-center w-full">
                  <span className="text-[8px] text-gray-300 uppercase block font-semibold leading-tight">Payable</span>
                  <span className="text-xs font-black text-emerald-300 font-mono">
                    +{payable} ETB
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Winning Cartel View Subheading */}
        <div className="text-[11px] font-extrabold text-orange-400 tracking-wider uppercase mb-2">
          Winning Cartel View
        </div>

        {/* 5x5 Winning Cartela (matches Screenshot 4) */}
        {primaryWinner && primaryWinner.grid && (
          <div className="w-full bg-[#1e1442] p-2 rounded-2xl border border-[#3a2777] shadow-inner">
            {/* Headers */}
            <div className="grid grid-cols-5 gap-1 mb-1 text-center font-black text-xs">
              {['B', 'I', 'N', 'G', 'O'].map((l) => (
                <div key={l} className={`${colColors[l]} text-white rounded-md py-0.5 shadow-sm`}>
                  {l}
                </div>
              ))}
            </div>

            {/* 5x5 Grid */}
            <div className="grid grid-cols-5 gap-1">
              {primaryWinner.grid.map((row, rIdx) =>
                row.map((val, cIdx) => {
                  const isWinningLine = winningCellsSet.has(`${rIdx}-${cIdx}`);
                  const isFree = val === 0;
                  const isCalled = calledSet.has(val);

                  let cellBg = 'bg-white text-gray-900 font-bold';
                  if (isWinningLine || (isFree && primaryWinner.pattern?.includes('Column N'))) {
                    // Winning pattern: Bright Emerald Green
                    cellBg = 'bg-[#10b981] text-white font-black shadow-md shadow-emerald-500/50';
                  } else if (isCalled) {
                    // Other called numbers on card: Bright Orange
                    cellBg = 'bg-[#f05a28] text-white font-extrabold shadow-sm';
                  }

                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold ${cellBg}`}
                    >
                      {isFree ? <Star className="w-3.5 h-3.5 fill-current" /> : val}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Starting in Xs Progress Bar */}
        <div className="w-full mt-4 flex flex-col items-center">
          <div className="text-[10px] text-gray-400 font-bold tracking-wider uppercase mb-1">
            Starting in {countdown}s
          </div>
          <div className="w-48 h-1.5 bg-[#251952] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${(countdown / (nextRoundIn || 6)) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
