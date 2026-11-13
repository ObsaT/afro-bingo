import React, { useState, useEffect } from 'react';
import { Download, Smartphone, ShieldCheck, ArrowRight, CheckCircle2, Globe, Sparkles } from 'lucide-react';

export default function InstallAppModal({ portalType = 'admin', onContinueWeb }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Check if already running in standalone display mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      if (onContinueWeb) onContinueWeb();
      return;
    }

    // Capture PWA install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      if (onContinueWeb) onContinueWeb();
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [onContinueWeb]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          if (onContinueWeb) onContinueWeb();
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      } finally {
        setInstalling(false);
        setDeferredPrompt(null);
      }
    } else {
      // Manual Android Chrome instructions
      alert(
        '📲 To install as APK on your Android device:\n\n1. Tap the Chrome menu (⋮) in the top right corner.\n2. Tap "Install app" or "Add to Home screen".\n3. Tap "Install" to create the dedicated Afro Bingo App icon!'
      );
    }
  };

  const isAgent = portalType === 'agent';
  const title = isAgent ? 'AFRO BINGO AGENT APP' : 'AFRO BINGO ADMIN APP';
  const subtitle = isAgent
    ? 'Dedicated Cashier & Player Top-up App'
    : 'Dedicated Master Management & Cashout Console';

  return (
    <div className="fixed inset-0 z-50 bg-[#0d071d]/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#1c1340] to-[#120a2a] border border-[#3d277d] rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-fade-in">
        {/* Glow background */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* App Icon badge */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-500 via-purple-600 to-cyan-400 p-0.5 shadow-xl shadow-purple-900/40 mb-4 relative">
          <div className="w-full h-full bg-[#160d33] rounded-[22px] flex items-center justify-center overflow-hidden">
            <img src="/pwa-192.png" alt="Afro Manager" className="w-16 h-16 object-contain" />
          </div>
          <span className="absolute -bottom-1 -right-1 p-1 bg-yellow-400 text-black rounded-lg text-[9px] font-black uppercase tracking-wider shadow">
            APK
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-1.5 justify-center">
          <span>{title}</span>
          <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
        </h2>
        <p className="text-xs text-purple-300 font-semibold mt-0.5 mb-3">{subtitle}</p>

        <p className="text-[11px] text-gray-300 leading-relaxed mb-4 bg-[#140c2d] p-3 rounded-2xl border border-[#2e1d63]">
          ለተሻለ ደህንነት እና ፈጣን ስራ አፕሊኬሽኑን ስልክዎ ላይ ጭነው (Install APK) ይጠቀሙ።
          <span className="block text-gray-400 text-[10px] mt-1">
            Install the dedicated application on your device for full-screen operation without browser bars.
          </span>
        </p>

        {/* Feature Badges */}
        <div className="w-full flex flex-col gap-2 mb-5 text-left">
          <div className="flex items-center gap-2.5 text-[11px] text-gray-200 bg-[#1e1444]/60 px-3 py-2 rounded-xl border border-[#372473]/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Full-screen cashier console without browser URL bars</span>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-gray-200 bg-[#1e1444]/60 px-3 py-2 rounded-xl border border-[#372473]/50">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Isolated secure agent & admin credential storage</span>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-gray-200 bg-[#1e1444]/60 px-3 py-2 rounded-xl border border-[#372473]/50">
            <Smartphone className="w-4 h-4 text-yellow-400 shrink-0" />
            <span>1-Tap launch directly from your Android home screen</span>
          </div>
        </div>

        {/* Primary Action: Install APK */}
        <button
          onClick={handleInstallClick}
          disabled={installing}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-black text-sm rounded-2xl shadow-lg shadow-orange-500/25 transition active:scale-95 flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4 text-black" />
          <span>{installing ? 'Preparing APK...' : '📲 Install App / APK to Device (አፕሊኬሽኑን ጫን)'}</span>
        </button>

        {/* Secondary Action: Continue in Web */}
        <button
          onClick={onContinueWeb}
          className="w-full mt-2.5 py-2.5 px-4 bg-[#23174e] hover:bg-[#2d1e63] text-gray-300 hover:text-white font-bold text-xs rounded-2xl border border-[#3d277d] transition active:scale-95 flex items-center justify-center gap-2"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>Operate in Browser Console (በዌብሳይት ቀጥል)</span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
