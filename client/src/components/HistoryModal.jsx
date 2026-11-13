import React, { useEffect, useState } from 'react';
import { Clock, Trophy } from 'lucide-react';

export default function HistoryModal() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => {
        if (data.history) setHistory(data.history);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 max-w-md mx-auto w-full">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-cyan-400" />
        <h2 className="text-xl font-black text-white tracking-wide">Game History</h2>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          No games completed in this session yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {history.map((h, idx) => (
            <div
              key={idx}
              className="bg-[#1b123d] p-3 rounded-2xl border border-[#34246e] flex flex-col gap-2 shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white tracking-wider">
                  Game #{h.gameId}
                </span>
                <span className="text-[10px] text-gray-400">{h.timestamp}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[#251950] p-2 rounded-xl text-center">
                <div>
                  <div className="text-[9px] text-gray-400 uppercase font-semibold">Players</div>
                  <div className="text-xs font-bold text-white">{h.playersCount}</div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-400 uppercase font-semibold">Called</div>
                  <div className="text-xs font-bold text-white">{h.calledCount} Balls</div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-400 uppercase font-semibold">Derash</div>
                  <div className="text-xs font-black text-[#ffcc00]">{h.derash} ETB</div>
                </div>
              </div>

              {h.winners && h.winners.length > 0 && (
                <div className="flex flex-col gap-1.5 border-t border-[#34246e]/70 pt-2 text-xs text-gray-300">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span className="text-[11px] font-bold text-yellow-300 uppercase tracking-wider">
                      Winners & Payable Amount:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {h.winners.map((w, wIdx) => {
                      const payable = w.payableAmount || (h.derash && h.winners.length ? Math.floor(h.derash / h.winners.length) : 0);
                      return (
                        <div
                          key={wIdx}
                          className="bg-[#251950] px-2.5 py-1 rounded-lg text-[11px] text-white flex items-center gap-2 border border-[#3c2980]"
                        >
                          <span className="font-bold text-yellow-200">{w.username}</span>
                          <span className="text-[10px] text-gray-400">(#{w.cartelaId})</span>
                          <span className="text-emerald-300 font-black font-mono">💰 +{payable} ETB</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
