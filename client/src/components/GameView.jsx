import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Star, Globe } from 'lucide-react';
import { playBallPop, announceBall, playClickSound, formatBallAmharic } from '../utils/audio';

export default function GameView({
  gameId,
  playersCount,
  stake,
  derash,
  houseCutPercent = 20,
  calledCount,
  currentBall,
  recentBalls = [],
  allCalledNumbers = [],
  myCartelas = [],
  onLeave,
  onRefresh,
  onClaimBingo,
  voiceLanguage = 'am',
  voiceGender = 'female',
}) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lang, setLang] = useState(voiceLanguage || 'am');
  const [gender, setGender] = useState(voiceGender || 'female');
  const [automaticDaub, setAutomaticDaub] = useState(true);
  const [manualMarks, setManualMarks] = useState(new Set());
  const [selectedCardIdx, setSelectedCardIdx] = useState(0);

  const calledSet = new Set(allCalledNumbers);

  // Sync prop changes
  useEffect(() => {
    if (voiceLanguage) setLang(voiceLanguage);
  }, [voiceLanguage]);

  useEffect(() => {
    if (voiceGender) setGender(voiceGender);
  }, [voiceGender]);

  // Play real person voice announcement when a new ball arrives (no electronic beep!)
  useEffect(() => {
    if (currentBall) {
      if (soundEnabled) {
        announceBall(currentBall.formatted, lang, gender);
      }
    }
  }, [currentBall?.formatted, soundEnabled, lang, gender]);

  // Active player cartela based on selected tab
  const activeCartela =
    myCartelas.length > 0
      ? myCartelas[selectedCardIdx] || myCartelas[0]
      : null;

  const isCellMarked = (val) => {
    if (val === 0) return true; // Free space
    if (automaticDaub) {
      return calledSet.has(val);
    }
    return manualMarks.has(val) && calledSet.has(val);
  };

  const toggleManualMark = (val) => {
    if (val === 0 || automaticDaub) return;
    playClickSound();
    setManualMarks((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  };

  // Color mapping for columns
  const colColors = {
    B: 'bg-[#3b82f6]', // Blue
    I: 'bg-[#8b5cf6]', // Purple
    N: 'bg-[#d946ef]', // Magenta
    G: 'bg-[#10b981]', // Teal/Green
    O: 'bg-[#f97316]', // Orange
  };

  const getRecentBadgeColor = (letter) => {
    if (letter === 'B') return 'bg-[#3b82f6]';
    if (letter === 'I') return 'bg-[#8b5cf6]';
    if (letter === 'N') return 'bg-[#d946ef]';
    if (letter === 'G') return 'bg-[#10b981]';
    return 'bg-[#f97316]';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#130d29]">
      {/* Top Game Stats Bar (5 stats) */}
      <div className="px-2 py-2 grid grid-cols-5 gap-1.5 bg-[#1b123d] border-b border-[#2d1e5e] text-center shadow-md">
        <div className="bg-[#261a54] rounded-lg py-1 px-0.5 border border-[#3b287d]">
          <div className="text-[9px] text-gray-400 font-semibold uppercase">Game ID</div>
          <div className="text-xs font-bold text-white truncate">{gameId}</div>
        </div>

        <div className="bg-[#261a54] rounded-lg py-1 px-0.5 border border-[#3b287d]">
          <div className="text-[9px] text-gray-400 font-semibold uppercase">Players</div>
          <div className="text-xs font-bold text-white">{playersCount}</div>
        </div>

        <div className="bg-[#261a54] rounded-lg py-1 px-0.5 border border-[#3b287d]">
          <div className="text-[9px] text-gray-400 font-semibold uppercase">Bet</div>
          <div className="text-xs font-bold text-white">{stake} ETB</div>
        </div>

        <div className="bg-[#261a54] rounded-lg py-1 px-0.5 border border-[#3b287d]">
          <div className="text-[9px] text-yellow-400 font-semibold uppercase">Derash ({100 - (houseCutPercent || 20)}%)</div>
          <div className="text-xs font-black text-[#ffcc00]">{derash} ETB</div>
        </div>

        <div className="bg-[#261a54] rounded-lg py-1 px-0.5 border border-[#3b287d]">
          <div className="text-[9px] text-gray-400 font-semibold uppercase">Called</div>
          <div className="text-xs font-bold text-white">{calledCount}</div>
        </div>
      </div>

      {/* Main Gameplay Screen - Split Layout (Left: Master Board, Right: Game / Cartela) */}
      <div className="flex-1 flex flex-row overflow-hidden p-2 gap-2">
        {/* LEFT COLUMN: 75-Ball Master Board */}
        <div className="w-[45%] max-w-[210px] bg-[#1a1238] rounded-xl p-1.5 border border-[#2d205c] flex flex-col overflow-y-auto shadow-inner">
          {/* Header Letters B I N G O */}
          <div className="grid grid-cols-5 gap-1 mb-1 text-center font-black text-xs">
            {['B', 'I', 'N', 'G', 'O'].map((letter) => (
              <div
                key={letter}
                className={`${colColors[letter]} text-white rounded-md py-0.5 shadow-sm`}
              >
                {letter}
              </div>
            ))}
          </div>

          {/* 15 Rows */}
          <div className="grid grid-cols-5 gap-1 flex-1">
            {Array.from({ length: 15 }, (_, rowIdx) => {
              const bNum = rowIdx + 1;
              const iNum = rowIdx + 16;
              const nNum = rowIdx + 31;
              const gNum = rowIdx + 46;
              const oNum = rowIdx + 61;
              const rowNums = [bNum, iNum, nNum, gNum, oNum];

              return rowNums.map((num) => {
                const isCurrent = currentBall && currentBall.number === num;
                const isCalled = calledSet.has(num);

                let cellStyle = 'bg-[#291e52] text-gray-300';
                if (isCurrent) {
                  // Most recent ball: bright emerald green
                  cellStyle = 'bg-[#10b981] text-white font-black scale-105 shadow-md shadow-emerald-500/50';
                } else if (isCalled) {
                  // Previously called balls: solid vibrant orange
                  cellStyle = 'bg-[#f05a28] text-white font-bold';
                }

                return (
                  <div
                    key={num}
                    className={`aspect-square flex items-center justify-center rounded text-[10px] md:text-xs font-semibold transition-all duration-200 ${cellStyle}`}
                  >
                    {num}
                  </div>
                );
              });
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Ball Announcer & Player Cartela or Watching */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          {/* Top Info: Recent Balls & Audio Mute & Big Ball */}
          <div className="bg-[#1a1238] rounded-xl p-2.5 border border-[#2d205c] flex flex-col gap-2 shadow-inner">
            {/* Top row: Recent balls badges + Sound toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {recentBalls.map((b, idx) => (
                  <div
                    key={idx}
                    className={`${getRecentBadgeColor(
                      b.letter
                    )} text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5`}
                  >
                    {b.formatted}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1.5 rounded-lg bg-[#291e52] hover:bg-[#36286c] text-gray-300 transition"
                  title={soundEnabled ? 'Mute' : 'Unmute'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-green-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
            </div>

            {/* Center Big Ball Display */}
            <div className="flex flex-col items-center justify-center py-1">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex items-center justify-center ring-4 ring-[#ffcc00] shadow-xl shadow-yellow-500/20 animate-bounce duration-700">
                <span className="text-xl md:text-2xl font-black text-[#1a1238] tracking-tight">
                  {currentBall ? currentBall.formatted : '--'}
                </span>
              </div>
              {currentBall && (
                <span className="text-[11px] font-black text-yellow-300 mt-1 tracking-wider bg-black/40 px-2.5 py-0.5 rounded-full border border-yellow-400/30">
                  {formatBallAmharic(currentBall.formatted)}
                </span>
              )}
            </div>

            {/* Automatic Daub Switch */}
            <div className="flex items-center justify-between px-2 pt-1 border-t border-[#291d57]">
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wide">Automatic</span>
              <button
                onClick={() => setAutomaticDaub(!automaticDaub)}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-300 ${
                  automaticDaub ? 'bg-[#10b981]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                    automaticDaub ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Center: Active Cartela OR Watching Only */}
          <div className="my-2 flex-1 flex flex-col justify-center">
            {activeCartela ? (
              /* Player's 5x5 Bingo Cartela */
              <div className="bg-[#1b123d] p-2 rounded-2xl border border-[#3b287d] shadow-2xl">
                {/* 1 to 3 Cartela Switcher Tabs */}
                {myCartelas.length > 1 ? (
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    {myCartelas.map((card, idx) => {
                      const isActive = (selectedCardIdx || 0) === idx;
                      return (
                        <button
                          key={card.id}
                          onClick={() => setSelectedCardIdx(idx)}
                          className={`px-3 py-1 rounded-xl text-xs font-black transition ${
                            isActive
                              ? 'bg-[#f05a28] text-white ring-2 ring-yellow-300 shadow-md scale-105'
                              : 'bg-[#251950] text-gray-300 hover:text-white'
                          }`}
                        >
                          Card #{card.id}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-xs font-bold text-gray-300 mb-1">
                    Cartela #{activeCartela.id}
                  </div>
                )}
                {/* Headers */}
                <div className="grid grid-cols-5 gap-1 mb-1 text-center font-black text-xs">
                  {['B', 'I', 'N', 'G', 'O'].map((l) => (
                    <div key={l} className={`${colColors[l]} text-white rounded-md py-0.5 shadow-sm`}>
                      {l}
                    </div>
                  ))}
                </div>
                {/* 5x5 Grid */}
                <div className="grid grid-cols-5 gap-1 text-center">
                  {activeCartela.grid.map((row, rIdx) =>
                    row.map((val, cIdx) => {
                      const marked = isCellMarked(val);
                      const isFree = val === 0;

                      let cellColor = 'bg-white text-gray-900 font-bold';
                      if (isFree) {
                        cellColor = 'bg-[#10b981] text-white';
                      } else if (marked) {
                        cellColor = 'bg-[#f05a28] text-white font-extrabold shadow-inner scale-95';
                      }

                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          onClick={() => toggleManualMark(val)}
                          className={`aspect-square flex items-center justify-center rounded-lg text-xs md:text-sm cursor-pointer transition active:scale-90 border border-black/10 ${cellColor}`}
                        >
                          {isFree ? <Star className="w-4 h-4 fill-white" /> : val}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Watching Only View (matches Screenshot 2) */
              <div className="bg-[#1a1238] rounded-xl p-4 border border-[#2d205c] flex flex-col items-center justify-center text-center flex-1 shadow-inner">
                <h3 className="text-lg md:text-xl font-extrabold tracking-wider text-white mb-2">
                  WATCHING ONLY
                </h3>
                <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-sans max-w-[200px]">
                  የዚህ ዙር ጨዋታ ተጀምሯል። አዲስ ዙር እስኪጀምር እዚህ ይጠብቁ።
                </p>
                <div className="mt-3 text-[10px] text-gray-500 uppercase tracking-widest">
                  (Wait for the next round)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Controls (matches Screenshot 2) */}
      <div className="p-2 bg-[#170e33] border-t border-[#291d57] grid grid-cols-3 gap-2">
        <button
          onClick={onLeave}
          className="py-2.5 px-3 bg-[#e64949] hover:bg-[#ff5555] text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 uppercase tracking-wider"
        >
          Leave
        </button>

        <button
          onClick={onRefresh}
          className="py-2.5 px-3 bg-[#261a54] hover:bg-[#342470] text-gray-200 text-xs font-bold rounded-xl border border-[#3e2b85] shadow-lg transition active:scale-95 uppercase tracking-wider"
        >
          Refresh
        </button>

        {activeCartela ? (
          <button
            onClick={() => onClaimBingo(activeCartela.id)}
            className="py-2.5 px-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black text-xs font-extrabold rounded-xl shadow-lg shadow-orange-500/30 transition active:scale-95 uppercase tracking-wider animate-pulse"
          >
            Bingo!
          </button>
        ) : (
          <button
            disabled
            className="py-2.5 px-3 bg-[#261a54]/50 text-gray-400 text-xs font-bold rounded-xl border border-[#31236b]/40 cursor-not-allowed uppercase tracking-wider"
          >
            Watching
          </button>
        )}
      </div>
    </div>
  );
}
