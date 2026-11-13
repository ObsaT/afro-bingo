import React from 'react';
import { Gamepad2, Trophy, Clock, Briefcase, User } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'game', label: 'GAME', icon: Gamepad2 },
    { id: 'scores', label: 'SCORES', icon: Trophy },
    { id: 'history', label: 'HISTORY', icon: Clock },
    { id: 'wallet', label: 'WALLET', icon: Briefcase },
    { id: 'profile', label: 'PROFILE', icon: User },
  ];

  return (
    <nav className="w-full bg-[#120a26] border-t border-[#25184a] px-2 py-1.5 flex items-center justify-around z-30 sticky bottom-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition duration-150 ${
              isActive ? 'text-[#38bdf8] scale-105' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className={`text-[10px] font-bold tracking-wider mt-0.5 ${isActive ? 'text-[#38bdf8]' : ''}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
