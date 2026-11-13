import React, { useEffect, useState } from 'react';
import { Trophy, Medal } from 'lucide-react';

export default function ScoresModal() {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    fetch('/api/scores')
      .then((res) => res.json())
      .then((data) => {
        if (data.leaderboard) setLeaderboard(data.leaderboard);
      })
      .catch(() => {});
  }, []);

  const getRankBadge = (idx) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `#${idx + 1}`;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 max-w-md mx-auto w-full">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h2 className="text-xl font-black text-white tracking-wide">Top Winners</h2>
      </div>

      <div className="flex flex-col gap-2 mt-1">
        {leaderboard.map((item, idx) => (
          <div
            key={idx}
            className="bg-[#1c133e] p-3 rounded-2xl border border-[#34246e] flex items-center justify-between shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold w-6 text-center">{getRankBadge(idx)}</span>
              <div>
                <div className="text-sm font-bold text-white">{item.username}</div>
                <div className="text-[11px] text-gray-400">{item.wins} Wins Total</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-black text-[#ffcc00]">{item.totalWon.toLocaleString()} ETB</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Earned</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
