import React from 'react';
import { Shield, Users, ArrowRight, Sparkles, Building2, Smartphone } from 'lucide-react';

export default function ManagerSelectorScreen({ onSelectAdmin, onSelectAgent, onOpenPlayerGame }) {
  return (
    <div className="flex flex-col min-h-screen w-screen max-w-lg mx-auto bg-[#100826] text-white select-none">
      {/* Top Header */}
      <header className="bg-[#170e38] border-b border-[#2d1b61] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 via-purple-600 to-yellow-400 p-0.5 shadow-md">
            <div className="w-full h-full bg-[#180d3b] rounded-[14px] flex items-center justify-center font-black text-white text-base">
              A
            </div>
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
              <span>AFRO BINGO MANAGER</span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            </h1>
            <div className="text-[10px] text-gray-400">Official Administration & Cashier Suite</div>
          </div>
        </div>

        <span className="text-[10px] px-2.5 py-1 bg-yellow-400/20 text-yellow-300 font-bold rounded-full border border-yellow-400/30">
          Standalone App
        </span>
      </header>

      {/* Main Selection Body */}
      <div className="flex-1 p-5 flex flex-col justify-center gap-4">
        <div className="text-center mb-2">
          <h2 className="text-xl font-black text-white tracking-wide">Select Console</h2>
          <p className="text-xs text-gray-400 mt-1">የሚፈልጉትን የስራ ክፍል ይምረጡ (Choose your operations portal)</p>
        </div>

        {/* 1. Admin Console Card */}
        <button
          onClick={onSelectAdmin}
          className="w-full bg-gradient-to-br from-[#241554] to-[#1c0f42] hover:from-[#2e1b6b] hover:to-[#241354] p-5 rounded-3xl border border-yellow-500/40 shadow-xl transition active:scale-95 text-left flex flex-col gap-3 group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 to-orange-500 flex items-center justify-center text-black font-black text-xl shadow-lg">
              👑
            </div>
            <span className="text-xs font-bold text-yellow-400 flex items-center gap-1 group-hover:translate-x-1 transition">
              <span>Enter Admin</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>

          <div>
            <h3 className="text-base font-black text-white group-hover:text-yellow-300 transition">
              Admin & Cashier Portal (የአድሚን መግቢያ)
            </h3>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              Manage bank accounts, game rules, house cut, player balances, approve cashouts & test data cleaner.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-[#3b247f] text-[10px] text-gray-400">
            <span>PIN Protected</span>
            <span>•</span>
            <span className="text-yellow-300">Master Control</span>
          </div>
        </button>

        {/* 2. Agent Portal Card */}
        <button
          onClick={onSelectAgent}
          className="w-full bg-gradient-to-br from-[#162752] to-[#111e40] hover:from-[#1d336b] hover:to-[#162752] p-5 rounded-3xl border border-cyan-400/40 shadow-xl transition active:scale-95 text-left flex flex-col gap-3 group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
              🤝
            </div>
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1 group-hover:translate-x-1 transition">
              <span>Enter Agent</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>

          <div>
            <h3 className="text-base font-black text-white group-hover:text-cyan-200 transition">
              Agent Cashier Portal (የወኪሎች መግቢያ)
            </h3>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              Verify Telebirr/CBE player deposits, approve cashouts with optional transaction fees & track commission.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-[#273f7d] text-[10px] text-gray-400">
            <span>Phone & PIN Login</span>
            <span>•</span>
            <span className="text-cyan-300">Cashier Desk</span>
          </div>
        </button>

        {/* Optional link back to player view */}
        {onOpenPlayerGame && (
          <button
            onClick={onOpenPlayerGame}
            className="mt-3 text-center text-xs text-gray-500 hover:text-gray-300 font-semibold transition py-2"
          >
            ← Open Player Bingo View
          </button>
        )}
      </div>

      <footer className="text-center pb-4 text-[11px] text-gray-500 font-mono">
        AFRO BINGO • Dedicated Operations Suite
      </footer>
    </div>
  );
}
