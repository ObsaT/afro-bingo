import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Header from './components/Header';
import CartelaSelection from './components/CartelaSelection';
import GameView from './components/GameView';
import WinningModal from './components/WinningModal';
import WalletModal from './components/WalletModal';
import ScoresModal from './components/ScoresModal';
import HistoryModal from './components/HistoryModal';
import ProfileModal from './components/ProfileModal';
import BottomNav from './components/BottomNav';
import AdminDashboard from './components/admin/AdminDashboard';
import AgentPortal from './components/agent/AgentPortal';
import InstallAppModal from './components/InstallAppModal';
import ManagerSelectorScreen from './components/ManagerSelectorScreen';
import { unlockAudio, playDepositAlertSound, playWithdrawalAlertSound } from './utils/audio';

export default function App() {
  const isAdminUrl = window.location.pathname === '/admin' || window.location.search.includes('admin=true');
  const isAgentUrl = window.location.pathname === '/agent' || window.location.search.includes('agent=true');
  const isManagerUrl = window.location.pathname === '/manager' || window.location.pathname === '/app';
  const isPlayerParam = typeof window !== 'undefined' && window.location.search.includes('player=true');
  const isInstallParam = typeof window !== 'undefined' && window.location.search.includes('install=true');

  const [showAdmin, setShowAdmin] = useState(isAdminUrl);
  const [showAgent, setShowAgent] = useState(isAgentUrl);
  const [inPlayerMode, setInPlayerMode] = useState(isPlayerParam);

  // Check if opened in standalone app mode vs browser
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

  const [hasPromptedInstall, setHasPromptedInstall] = useState(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dismiss_install_prompt') === 'true'
  );

  const shouldShowInstallModal = isInstallParam && !isStandalone && !hasPromptedInstall;
  const [activeTab, setActiveTab] = useState('game');
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState(null);

  // Game Engine State
  const [gameId, setGameId] = useState('DBI14IS7');
  const [gameState, setGameState] = useState('SELECTION'); // 'SELECTION' | 'PLAYING' | 'ENDED'
  const [countdown, setCountdown] = useState(35);
  const [stake, setStake] = useState(10);
  const [derash, setDerash] = useState(0);
  const [playersCount, setPlayersCount] = useState(0);
  const [calledCount, setCalledCount] = useState(0);
  const [currentBall, setCurrentBall] = useState(null);
  const [recentBalls, setRecentBalls] = useState([]);
  const [allCalledNumbers, setAllCalledNumbers] = useState([]);
  const [takenCartelas, setTakenCartelas] = useState([]);
  const [myCartelas, setMyCartelas] = useState([]);
  const [winners, setWinners] = useState([]);
  const [prizePerWinner, setPrizePerWinner] = useState(0);
  const [nextRoundIn, setNextRoundIn] = useState(6);
  const [maxCartelasPerPlayer, setMaxCartelasPerPlayer] = useState(3);
  const [totalCartelas, setTotalCartelas] = useState(100);
  const [houseCutPercent, setHouseCutPercent] = useState(20);
  const [voiceLanguage, setVoiceLanguage] = useState('am');
  const [voiceGender, setVoiceGender] = useState('female');
  const [bonusSettings, setBonusSettings] = useState(null);
  const [supportSettings, setSupportSettings] = useState(null);

  const socketRef = useRef(null);

  // 1. Initialize Telegram Mini App & Socket.IO
  useEffect(() => {
    // Unlock browser audio context & speech synthesis on first touch
    const handleFirstGesture = () => {
      unlockAudio();
    };
    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true });

    // Expand Telegram Mini App viewport
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor('#130d29');
      if (tg.setBackgroundColor) tg.setBackgroundColor('#120c24');
    }

    // Determine initial user
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    let initialUserData;
    if (tgUser && tgUser.id) {
      initialUserData = {
        id: String(tgUser.id),
        first_name: tgUser.first_name,
        username: tgUser.username || tgUser.first_name,
      };
      try {
        localStorage.setItem('afro_bingo_user_id', String(tgUser.id));
        localStorage.setItem('afro_bingo_username', tgUser.username || tgUser.first_name || 'Player');
      } catch (e) {}
    } else {
      let storedId = null;
      let storedName = null;
      try {
        storedId = localStorage.getItem('afro_bingo_user_id');
        storedName = localStorage.getItem('afro_bingo_username');
      } catch (e) {}

      if (!storedId) {
        storedId = 'user_' + Math.floor(1000 + Math.random() * 9000);
        storedName = 'Player_' + storedId.slice(-4);
        try {
          localStorage.setItem('afro_bingo_user_id', storedId);
          localStorage.setItem('afro_bingo_username', storedName);
        } catch (e) {}
      }

      initialUserData = {
        id: storedId,
        first_name: storedName || 'Player',
        username: storedName || 'AfroPlayer',
      };
    }

    // Capture referral code if opened via Telegram referral or URL link
    const urlParams = new URLSearchParams(window.location.search);
    const tgStartParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    const refCode = tgStartParam || urlParams.get('ref') || urlParams.get('start');
    if (refCode) {
      initialUserData.referralCode = refCode;
    }

    // Socket.io initialization
    const socket = io('/', {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_game', initialUserData);
    });

    socket.on('game_init', (state) => {
      setGameId(state.gameId);
      setGameState(state.state);
      setCountdown(state.countdown);
      setStake(state.stake);
      setDerash(state.derash);
      setPlayersCount(state.playersCount);
      setCalledCount(state.calledCount);
      setCurrentBall(state.currentBall);
      setRecentBalls(state.recentBalls || []);
      setAllCalledNumbers(state.allCalledNumbers || []);
      setTakenCartelas(state.takenCartelas || []);
      setMyCartelas(state.userCartelas || []);
      setWinners(state.winners || []);
      if (state.winners) setWinners(state.winners);
      if (state.bonusSettings) setBonusSettings(state.bonusSettings);
      if (state.supportSettings) setSupportSettings(state.supportSettings);
      if (state.houseCutPercent !== undefined) setHouseCutPercent(state.houseCutPercent);
      if (state.maxCartelasPerPlayer) setMaxCartelasPerPlayer(state.maxCartelasPerPlayer);
      if (state.totalCartelas) setTotalCartelas(state.totalCartelas);
      if (state.voiceLanguage) setVoiceLanguage(state.voiceLanguage);
      if (state.voiceGender) setVoiceGender(state.voiceGender);
      if (state.user) setUser(state.user);
    });

    socket.on('game_state', (state) => {
      setGameId(state.gameId);
      setGameState(state.state);
      setCountdown(state.countdown);
      setStake(state.stake);
      setDerash(state.derash);
      setPlayersCount(state.playersCount);
      setCalledCount(state.calledCount);
      setCurrentBall(state.currentBall);
      setRecentBalls(state.recentBalls || []);
      setAllCalledNumbers(state.allCalledNumbers || []);
      setTakenCartelas(state.takenCartelas || []);
      setWinners(state.winners || []);
      if (state.houseCutPercent !== undefined) setHouseCutPercent(state.houseCutPercent);
      if (state.maxCartelasPerPlayer) setMaxCartelasPerPlayer(state.maxCartelasPerPlayer);
      if (state.totalCartelas) setTotalCartelas(state.totalCartelas);
      if (state.voiceLanguage) setVoiceLanguage(state.voiceLanguage);
      if (state.voiceGender) setVoiceGender(state.voiceGender);

      // If transition back to SELECTION, reset my cartelas
      if (state.state === 'SELECTION') {
        setMyCartelas([]);
      }
    });

    socket.on('countdown_tick', ({ countdown, takenCartelas }) => {
      setCountdown(countdown);
      if (takenCartelas) setTakenCartelas(takenCartelas);
    });

    socket.on('game_settings_updated', (data) => {
      if (data.maxCartelasPerPlayer) setMaxCartelasPerPlayer(data.maxCartelasPerPlayer);
      if (data.totalCartelas) setTotalCartelas(data.totalCartelas);
      if (data.voiceLanguage) setVoiceLanguage(data.voiceLanguage);
      if (data.voiceGender) setVoiceGender(data.voiceGender);
    });

    socket.on('ball_called', (data) => {
      setCurrentBall(data.currentBall);
      setCalledCount(data.calledCount);
      setRecentBalls(data.calledList || []);
      setAllCalledNumbers(data.allCalledNumbers || []);
    });

    socket.on('cartela_updated', (data) => {
      setTakenCartelas(data.takenCartelas);
      setDerash(data.derash);
      setPlayersCount(data.playerCount);
    });

    socket.on('cartela_select_result', (result) => {
      if (result.success) {
        if (result.action === 'selected') {
          setMyCartelas((prev) => [...prev, result.cartela]);
        } else if (result.action === 'deselected') {
          setMyCartelas((prev) => prev.filter((c) => c.id !== result.cartelaId));
        }
        setUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            playWallet: result.balance !== undefined ? result.balance : prev.playWallet,
            mainWallet: result.mainWallet !== undefined ? result.mainWallet : prev.mainWallet,
          };
        });
      } else {
        alert(result.error);
      }
    });

    socket.on('game_over', (data) => {
      setWinners(data.winners || []);
      setPrizePerWinner(data.prizePerWinner || 0);
      setDerash(data.derash || 0);
      setNextRoundIn(data.nextRoundIn || 6);
      setGameState('ENDED');
    });

    socket.on('wallet_updated', (data) => {
      setUser((prev) => {
        if (!prev) return prev;
        if (data.userId && String(data.userId) !== String(prev.id)) return prev;

        const oldTotal = Number(prev.mainWallet || 0) + Number(prev.playWallet || 0);
        const newTotal = Number(data.mainWallet ?? prev.mainWallet) + Number(data.playWallet ?? prev.playWallet);
        if (newTotal > oldTotal) {
          playDepositAlertSound();
        }

        return {
          ...prev,
          mainWallet: data.mainWallet !== undefined && data.mainWallet !== null ? data.mainWallet : prev.mainWallet,
          playWallet: data.playWallet !== undefined && data.playWallet !== null ? data.playWallet : prev.playWallet,
        };
      });
      if (data.message) {
        alert(data.message);
      }
    });

    socket.on('support_settings_updated', (data) => {
      if (data) setSupportSettings(data);
    });

    // Fetch initial support settings fallback
    fetch('/api/support-settings')
      .then((r) => r.json())
      .then((data) => {
        if (data) setSupportSettings(data);
      })
      .catch(() => {});

    return () => {
      socket.disconnect();
    };
  }, []);

  // Handlers
  const handleSelectCartela = (cartelaId) => {
    if (socketRef.current) {
      socketRef.current.emit('select_cartela', { cartelaId });
    }
  };

  const handleClaimBingo = (cartelaId) => {
    if (socketRef.current) {
      socketRef.current.emit('claim_bingo', { cartelaId });
    }
  };

  const handleDeposit = async (amount, provider) => {
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, amount, provider }),
      });
      const data = await res.json();
      if (data.success) {
        setUser((prev) => ({
          ...prev,
          mainWallet: data.mainWallet,
          playWallet: data.playWallet,
        }));
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  };

  const handleTransfer = async (amount, direction) => {
    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, amount, direction }),
      });
      const data = await res.json();
      if (data.success) {
        setUser((prev) => ({
          ...prev,
          mainWallet: data.mainWallet,
          playWallet: data.playWallet,
        }));
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  };

  const handleWithdraw = async (amount, provider, accountNumber) => {
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, amount, provider, accountNumber }),
      });
      const data = await res.json();
      if (data.success) {
        setUser((prev) => ({
          ...prev,
          mainWallet: data.mainWallet,
          playWallet: data.playWallet,
        }));
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleLeave = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.close();
    } else {
      setActiveTab('profile');
    }
  };

  if (showAdmin) {
    return (
      <>
        {shouldShowInstallModal && (
          <InstallAppModal
            portalType="admin"
            onContinueWeb={() => {
              sessionStorage.setItem('dismiss_install_prompt', 'true');
              setHasPromptedInstall(true);
            }}
          />
        )}
        <AdminDashboard
          onExit={() => {
            window.history.pushState(null, '', '/manager');
            setShowAdmin(false);
          }}
        />
      </>
    );
  }

  if (showAgent) {
    return (
      <>
        {shouldShowInstallModal && (
          <InstallAppModal
            portalType="agent"
            onContinueWeb={() => {
              sessionStorage.setItem('dismiss_install_prompt', 'true');
              setHasPromptedInstall(true);
            }}
          />
        )}
        <AgentPortal
          onExit={() => {
            window.history.pushState(null, '', '/manager');
            setShowAgent(false);
          }}
        />
      </>
    );
  }

  // If running in Standalone Installed App mode (or /manager URL), dedicate the app to Admin & Agent!
  if ((isStandalone || isManagerUrl) && !inPlayerMode && !showAdmin && !showAgent) {
    return (
      <ManagerSelectorScreen
        onSelectAdmin={() => {
          window.history.pushState(null, '', '/admin');
          setShowAdmin(true);
        }}
        onSelectAgent={() => {
          window.history.pushState(null, '', '/agent');
          setShowAgent(true);
        }}
        onOpenPlayerGame={() => {
          window.history.pushState(null, '', '/');
          setInPlayerMode(true);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen max-w-lg mx-auto bg-[#120c24] text-white overflow-hidden shadow-2xl relative select-none">
      {shouldShowInstallModal && !showAdmin && !showAgent && (
        <InstallAppModal
          portalType="player"
          onContinueWeb={() => {
            sessionStorage.setItem('dismiss_install_prompt', 'true');
            setHasPromptedInstall(true);
          }}
        />
      )}

      {/* Top Header */}
      <Header
        title="AFRO BINGO"
        user={user}
        mainWallet={user?.mainWallet ?? 0}
        playWallet={user?.playWallet ?? 0}
        stake={stake}
        countdown={gameState === 'SELECTION' ? countdown : null}
        showStats={activeTab === 'game' && gameState === 'SELECTION'}
        onBack={handleLeave}
        onRefresh={handleRefresh}
        onOpenDeposit={() => setActiveTab('wallet')}
        onOpenWithdrawal={() => setActiveTab('wallet')}
        onOpenAdmin={() => setShowAdmin(true)}
        onOpenAgent={() => setShowAgent(true)}
        supportSettings={supportSettings}
      />

      {/* Main Tab Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'game' && (
          <>
            {gameState === 'SELECTION' && (
              <CartelaSelection
                user={user}
                takenCartelas={takenCartelas}
                myCartelas={myCartelas}
                onSelectCartela={handleSelectCartela}
                stake={stake}
                derash={derash}
                playersCount={playersCount}
                houseCutPercent={houseCutPercent}
                maxCartelasPerPlayer={maxCartelasPerPlayer}
                totalCartelas={totalCartelas}
                onOpenDeposit={() => setActiveTab('wallet')}
              />
            )}

            {(gameState === 'PLAYING' || gameState === 'ENDED') && (
              <GameView
                gameId={gameId}
                playersCount={playersCount}
                stake={stake}
                derash={derash}
                houseCutPercent={houseCutPercent}
                calledCount={calledCount}
                currentBall={currentBall}
                recentBalls={recentBalls}
                allCalledNumbers={allCalledNumbers}
                myCartelas={myCartelas}
                onLeave={handleLeave}
                onRefresh={handleRefresh}
                onClaimBingo={handleClaimBingo}
                voiceLanguage={voiceLanguage}
                voiceGender={voiceGender}
              />
            )}

            {/* Winning celebration modal */}
            {gameState === 'ENDED' && (
              <WinningModal
                winners={winners}
                prizePerWinner={prizePerWinner}
                derash={derash}
                allCalledNumbers={allCalledNumbers}
                nextRoundIn={nextRoundIn}
                voiceLanguage={voiceLanguage}
                voiceGender={voiceGender}
                user={user}
                myCartelas={myCartelas}
                stake={stake}
              />
            )}
          </>
        )}

        {activeTab === 'wallet' && (
          <WalletModal
            user={user}
            bonusSettings={bonusSettings}
            supportSettings={supportSettings}
            onDeposit={handleDeposit}
            onTransfer={handleTransfer}
            onWithdraw={handleWithdraw}
            onClose={() => setActiveTab('game')}
          />
        )}

        {activeTab === 'scores' && <ScoresModal />}

        {activeTab === 'history' && <HistoryModal />}

        {activeTab === 'profile' && (
          <ProfileModal
            user={user}
            supportSettings={supportSettings}
            onOpenDeposit={() => setActiveTab('wallet')}
            onOpenAdmin={() => setShowAdmin(true)}
            onOpenAgent={() => setShowAgent(true)}
          />
        )}
      </main>

      {/* Bottom Navigation (5 tabs) */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
