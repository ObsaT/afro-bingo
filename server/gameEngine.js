const { CARTELAS, checkBingo, getBallLetter } = require('./cartelas');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'data/users.json');
const BONUS_SETTINGS_FILE = path.join(__dirname, 'data/bonusSettings.json');

class BingoGameEngine {
  constructor(io) {
    this.io = io;
    this.stake = 10; // Default stake: 10 Birr
    this.houseCut = 0.20; // 20% house rake, 80% to Derash pool

    // Bonus settings for First Join & Invitation (Acc & Play account amounts)
    this.bonusSettings = {
      firstJoin: {
        accAmount: 0, // ETB in Main Account on first join
        playAmount: 50, // ETB in Play Account on first join
      },
      invitation: {
        inviterAccAmount: 5, // ETB in Main Account for the inviter
        inviterPlayAmount: 20, // ETB in Play Account for the inviter
        friendAccAmount: 0, // Extra ETB in Main Account for invited friend
        friendPlayAmount: 15, // Extra ETB in Play Account for invited friend
      },
    };
    this.loadBonusSettings();

    // Persistent player accounts
    this.users = new Map(); // id or telegramId -> user object
    this.loadUsers();

    // Simulation toggle (Default: false - only real players unless turned on by Admin)
    this.enableSimulation = false;
    this.simulatedBotCount = 20; // Configurable number of bots to simulate (Default: 20)

    // Configurable maximum cartelas allowed per player (Default: 3)
    this.maxCartelasPerPlayer = 3;

    // Configurable total cartelas available in game (Default: 100, adjustable to 50, 100, 150, 200, etc.)
    this.totalCartelas = 100;

    // Voice announcer settings
    this.voiceLanguage = 'am'; // 'am' | 'en'
    this.voiceGender = 'female'; // 'female' ('girl') | 'male' ('man')

    // Game state
    this.gameId = this.generateGameId();
    this.state = 'SELECTION'; // 'SELECTION' | 'PLAYING' | 'ENDED'
    this.countdown = 35; // Cartela selection seconds
    this.timerInterval = null;

    // Cartelas taken in current round: cartelaId -> { userId, username, isBot, cartela }
    this.takenCartelas = new Map();

    // Calling state
    this.calledBalls = [];
    this.calledSet = new Set();
    this.ballPool = [];
    this.currentBall = null;
    this.callInterval = null;
    this.winners = []; // [{ userId, username, cartelaId, winningCartela, pattern }]

    // Game history
    this.history = [];

    // Leaderboard
    this.leaderboard = [
      { username: 'Muktar Ramadan', wins: 28, totalWon: 67200 },
      { username: 'Bravo_Sf', wins: 24, totalWon: 53100 },
      { username: 'meles', wins: 19, totalWon: 41800 },
      { username: 'ሻፈራው ከበደ', wins: 17, totalWon: 39500 },
      { username: 'Yared_G', wins: 14, totalWon: 31200 },
      { username: 'Selamawit', wins: 12, totalWon: 27900 },
    ];

    // Start initial round
    this.startSelectionPhase();
  }

  generateGameId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'DBI';
    for (let i = 0; i < 5; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  loadUsers() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((u) => {
            if (u && u.id) this.users.set(String(u.id), u);
          });
        }
      }
    } catch (e) {
      console.error('Error loading users:', e);
    }
  }

  saveUsers() {
    try {
      const dataDir = path.dirname(USERS_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const list = Array.from(this.users.values());
      fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving users:', e);
    }
  }

  loadBonusSettings() {
    try {
      if (fs.existsSync(BONUS_SETTINGS_FILE)) {
        const raw = fs.readFileSync(BONUS_SETTINGS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed) {
          this.bonusSettings = {
            firstJoin: {
              accAmount: Number(parsed.firstJoin?.accAmount ?? 0),
              playAmount: Number(parsed.firstJoin?.playAmount ?? 50),
            },
            invitation: {
              inviterAccAmount: Number(parsed.invitation?.inviterAccAmount ?? 5),
              inviterPlayAmount: Number(parsed.invitation?.inviterPlayAmount ?? 20),
              friendAccAmount: Number(parsed.invitation?.friendAccAmount ?? 0),
              friendPlayAmount: Number(parsed.invitation?.friendPlayAmount ?? 15),
            },
          };
        }
      } else {
        this.saveBonusSettings(this.bonusSettings);
      }
    } catch (e) {
      console.error('Error loading bonus settings:', e);
    }
  }

  saveBonusSettings(newSettings) {
    try {
      if (newSettings) {
        if (newSettings.firstJoin) {
          this.bonusSettings.firstJoin = {
            accAmount: Math.max(0, Number(newSettings.firstJoin.accAmount ?? this.bonusSettings.firstJoin.accAmount)),
            playAmount: Math.max(0, Number(newSettings.firstJoin.playAmount ?? this.bonusSettings.firstJoin.playAmount)),
          };
        }
        if (newSettings.invitation) {
          this.bonusSettings.invitation = {
            inviterAccAmount: Math.max(0, Number(newSettings.invitation.inviterAccAmount ?? this.bonusSettings.invitation.inviterAccAmount)),
            inviterPlayAmount: Math.max(0, Number(newSettings.invitation.inviterPlayAmount ?? this.bonusSettings.invitation.inviterPlayAmount)),
            friendAccAmount: Math.max(0, Number(newSettings.invitation.friendAccAmount ?? this.bonusSettings.invitation.friendAccAmount)),
            friendPlayAmount: Math.max(0, Number(newSettings.invitation.friendPlayAmount ?? this.bonusSettings.invitation.friendPlayAmount)),
          };
        }
      }
      const dataDir = path.dirname(BONUS_SETTINGS_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(BONUS_SETTINGS_FILE, JSON.stringify(this.bonusSettings, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error('Error saving bonus settings:', e);
      return false;
    }
  }

  getOrCreateUser(userData, referralCode = null) {
    const userId = String(userData.id || 'guest_' + Math.floor(Math.random() * 9000 + 1000));
    const isNew = !this.users.has(userId);

    if (isNew) {
      const firstJoinAcc = Number(this.bonusSettings.firstJoin.accAmount || 0);
      const firstJoinPlay = Number(this.bonusSettings.firstJoin.playAmount || 50);

      const newUser = {
        id: userId,
        telegramId: userData.id,
        username: userData.username || userData.first_name || 'AfroPlayer',
        firstName: userData.first_name || 'Player',
        mainWallet: firstJoinAcc, // Acc balance configured by admin
        playWallet: firstJoinPlay, // Play balance configured by admin
        gamesPlayed: 0,
        gamesWon: 0,
        referralsCount: 0,
        referralHistory: [],
        createdAt: new Date().toISOString(),
      };

      // Process referral / invitation bonus if referralCode is provided
      if (referralCode) {
        const cleanRef = String(referralCode).trim().replace(/^ref_|^invite_/, '');
        const referrer = this.users.get(cleanRef);

        if (referrer && String(referrer.id) !== userId) {
          const inviterAcc = Number(this.bonusSettings.invitation.inviterAccAmount || 5);
          const inviterPlay = Number(this.bonusSettings.invitation.inviterPlayAmount || 20);
          const friendAcc = Number(this.bonusSettings.invitation.friendAccAmount || 0);
          const friendPlay = Number(this.bonusSettings.invitation.friendPlayAmount || 15);

          // Give bonus to the new player
          newUser.referredBy = referrer.id;
          newUser.mainWallet += friendAcc;
          newUser.playWallet += friendPlay;
          newUser.referralBonus = {
            friendAcc,
            friendPlay,
            referrerName: referrer.username,
          };

          // Give bonus to the inviter
          referrer.mainWallet += inviterAcc;
          referrer.playWallet += inviterPlay;
          referrer.referralsCount = (referrer.referralsCount || 0) + 1;
          referrer.referralHistory = referrer.referralHistory || [];
          referrer.referralHistory.push({
            friendId: userId,
            friendName: newUser.username,
            accEarned: inviterAcc,
            playEarned: inviterPlay,
            date: new Date().toISOString(),
          });

          // Live real-time socket event to inviter
          if (this.io) {
            this.io.to(`user_${referrer.id}`).emit('wallet_updated', {
              userId: referrer.id,
              mainWallet: referrer.mainWallet,
              playWallet: referrer.playWallet,
              message: `🎉 ጓደኛዎ ${newUser.username} ግብዣዎን ተቀብለው ተቀላቅለዋል! +${inviterPlay} ETB Play Account እና +${inviterAcc} ETB Main Acc ተሸልመዋል!`,
            });
          }
        }
      }

      this.users.set(userId, newUser);
      this.saveUsers();
    } else {
      const existing = this.users.get(userId);
      if (userData.username && userData.username !== existing.username) {
        existing.username = userData.username;
        this.saveUsers();
      }
    }
    return this.users.get(userId);
  }

  // Pre-fill some bot cartelas for realistic atmosphere
  seedBotCartelas() {
    if (!this.enableSimulation) return;
    const botCount = Math.min(this.simulatedBotCount, this.totalCartelas);
    const available = [];
    for (let i = 1; i <= this.totalCartelas; i++) {
      if (!this.takenCartelas.has(i)) available.push(i);
    }
    // Shuffle available
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    const botNames = [
      'Muktar Ramadan', 'Bravo_Sf', 'meles', 'ሻፈራው ከበደ', 'Kenenisa_B',
      'Almaz_Ayana', 'Haile_G', 'Tsegaye', 'Abebe_B', 'Dawit_T',
      'Biruk_M', 'Ephrem_K', 'Sintayehu', 'Kalkidan', 'Nebiyu_A',
      'Yohannes_Z', 'Robel_D', 'Tigist_A', 'Binyam_G', 'Aster_A',
      'Solomon_H', 'Lidetu', 'Girma_W', 'Zelalem_T', 'Meron_S'
    ];

    const pickCount = Math.min(botCount, available.length);
    for (let i = 0; i < pickCount; i++) {
      const cid = available[i];
      const botName = botNames[i % botNames.length] + (i >= botNames.length ? ` #${cid}` : '');
      this.takenCartelas.set(cid, {
        userId: `bot_${cid}`,
        username: botName,
        isBot: true,
        cartela: CARTELAS[cid] || generateCartela(cid),
      });
    }
  }

  startSelectionPhase() {
    this.state = 'SELECTION';
    this.gameId = this.generateGameId();
    this.countdown = 35;
    this.takenCartelas.clear();
    this.calledBalls = [];
    this.calledSet.clear();
    this.currentBall = null;
    this.winners = [];

    // Seed bot cartelas
    this.seedBotCartelas();

    if (this.callInterval) clearInterval(this.callInterval);
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.broadcastState();

    this.timerInterval = setInterval(() => {
      this.countdown--;
      // Sometimes another bot claims a cartela during countdown (only if simulation is ON)
      if (this.enableSimulation && this.countdown % 3 === 0) {
        const currentBotCount = Array.from(this.takenCartelas.values()).filter((t) => t.isBot).length;
        if (currentBotCount < this.simulatedBotCount) {
          const untaken = [];
          for (let i = 1; i <= this.totalCartelas; i++) {
            if (!this.takenCartelas.has(i)) untaken.push(i);
          }
          if (untaken.length > 0) {
            const randId = untaken[Math.floor(Math.random() * untaken.length)];
            this.takenCartelas.set(randId, {
              userId: `bot_${randId}`,
              username: `Player_${randId}`,
              isBot: true,
              cartela: CARTELAS[randId] || generateCartela(randId),
            });
          }
        }
      }

      this.io.emit('countdown_tick', { countdown: this.countdown, takenCartelas: this.getTakenCartelaIds() });

      if (this.countdown <= 0) {
        if (!this.enableSimulation && this.takenCartelas.size === 0) {
          // No real players joined yet, reset timer to keep waiting for players
          this.countdown = 35;
          return;
        }
        clearInterval(this.timerInterval);
        this.startPlayingPhase();
      }
    }, 1000);
  }

  getTakenCartelaIds() {
    return Array.from(this.takenCartelas.keys());
  }

  getDerash() {
    const totalPlayers = Math.max(this.takenCartelas.size, 1);
    const gross = totalPlayers * this.stake;
    return Math.floor(gross * (1 - this.houseCut));
  }

  startPlayingPhase() {
    this.state = 'PLAYING';
    this.ballPool = Array.from({ length: 75 }, (_, i) => i + 1);
    // Shuffle balls
    for (let i = this.ballPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.ballPool[i], this.ballPool[j]] = [this.ballPool[j], this.ballPool[i]];
    }

    this.broadcastState();

    // Call ball every 2.8s
    this.callInterval = setInterval(() => {
      this.callNextBall();
    }, 2800);
  }

  callNextBall() {
    if (this.ballPool.length === 0 || this.state !== 'PLAYING') {
      if (this.callInterval) clearInterval(this.callInterval);
      return;
    }

    const ballNumber = this.ballPool.pop();
    const letter = getBallLetter(ballNumber);
    const ballObj = {
      number: ballNumber,
      letter,
      formatted: `${letter}-${ballNumber}`,
    };

    this.currentBall = ballObj;
    this.calledBalls.unshift(ballObj); // newest first
    this.calledSet.add(ballNumber);

    // Broadcast called ball
    this.io.emit('ball_called', {
      currentBall: ballObj,
      calledCount: this.calledBalls.length,
      calledList: this.calledBalls.slice(0, 4), // current + last 3
      allCalledNumbers: Array.from(this.calledSet),
    });

    // Check all taken cartelas for BINGO!
    const roundWinners = [];
    for (const [cid, entry] of this.takenCartelas.entries()) {
      const result = checkBingo(entry.cartela, this.calledSet);
      if (result.won) {
        roundWinners.push({
          userId: entry.userId,
          username: entry.username,
          cartelaId: cid,
          pattern: result.pattern,
          winningCells: result.winningCells,
          grid: entry.cartela.grid,
          isBot: entry.isBot,
        });
      }
    }

    if (roundWinners.length > 0) {
      this.endGame(roundWinners);
    }
  }

  endGame(roundWinners) {
    if (this.callInterval) clearInterval(this.callInterval);
    this.state = 'ENDED';
    this.winners = roundWinners;

    const derash = this.getDerash();
    const prizePerWinner = Math.floor(derash / Math.max(roundWinners.length, 1));

    const winnerUserIds = new Set(roundWinners.map((w) => String(w.userId)));

    // Credit real winners
    for (const winner of roundWinners) {
      if (!winner.isBot && this.users.has(String(winner.userId))) {
        const u = this.users.get(String(winner.userId));
        u.playWallet = (u.playWallet || 0) + prizePerWinner;
        u.gamesWon = (u.gamesWon || 0) + 1;
        this.io.to(`user_${u.id}`).emit('wallet_updated', {
          userId: u.id,
          mainWallet: u.mainWallet,
          playWallet: u.playWallet,
          message: `🏆 እንኳን ደስ አለዎት! ${prizePerWinner} ETB አሸንፈዋል!`,
        });
      }
    }

    // Sync wallet & notify real players who participated and lost
    for (const [cid, entry] of this.takenCartelas.entries()) {
      if (!entry.isBot && !winnerUserIds.has(String(entry.userId))) {
        const u = this.users.get(String(entry.userId));
        if (u) {
          this.io.to(`user_${u.id}`).emit('wallet_updated', {
            userId: u.id,
            mainWallet: u.mainWallet,
            playWallet: u.playWallet,
          });
        }
      }
    }

    this.saveUsers();

    // Save to history
    this.history.unshift({
      gameId: this.gameId,
      playersCount: this.takenCartelas.size,
      bet: this.stake,
      grossPool: this.takenCartelas.size * this.stake,
      houseCutPercent: Math.round(this.houseCut * 100),
      derash,
      prizePerWinner,
      calledCount: this.calledBalls.length,
      winners: roundWinners.map((w) => ({
        userId: w.userId,
        username: w.username,
        cartelaId: w.cartelaId,
        pattern: w.pattern,
        payableAmount: prizePerWinner,
      })),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    if (this.history.length > 30) this.history.pop();

    this.io.emit('game_over', {
      winners: roundWinners.map((w) => ({
        ...w,
        payableAmount: prizePerWinner,
      })),
      prizePerWinner,
      derash,
      nextRoundIn: 6,
    });

    // Wait 6 seconds and start new round
    setTimeout(() => {
      this.startSelectionPhase();
    }, 6000);
  }

  // User buys/selects a cartela
  selectCartela(userId, cartelaId) {
    if (this.state !== 'SELECTION') {
      return { success: false, error: 'Cannot select cartela once round has started' };
    }
    if (cartelaId < 1 || cartelaId > this.totalCartelas) {
      return { success: false, error: 'Invalid cartela ID' };
    }
    if (this.takenCartelas.has(cartelaId)) {
      const owner = this.takenCartelas.get(cartelaId);
      if (owner.userId === userId) {
        // Deselect/Refund
        this.takenCartelas.delete(cartelaId);
        const user = this.users.get(userId);
        if (user) {
          user.playWallet = (user.playWallet || 0) + this.stake;
          this.saveUsers();
          this.io.to(`user_${userId}`).emit('wallet_updated', {
            userId: user.id,
            mainWallet: user.mainWallet,
            playWallet: user.playWallet,
          });
        }
        this.io.emit('cartela_updated', {
          cartelaId,
          action: 'deselected',
          takenCartelas: this.getTakenCartelaIds(),
          derash: this.getDerash(),
          playerCount: this.takenCartelas.size,
        });
        return {
          success: true,
          action: 'deselected',
          cartelaId,
          balance: user ? user.playWallet : 0,
          mainWallet: user ? user.mainWallet : 0,
        };
      }
      return { success: false, error: 'Cartela already taken by another player' };
    }

    // Enforce configurable maximum cartelas per player
    let userCartelaCount = 0;
    for (const entry of this.takenCartelas.values()) {
      if (entry.userId === userId) {
        userCartelaCount++;
      }
    }
    if (userCartelaCount >= this.maxCartelasPerPlayer) {
      return {
        success: false,
        error: `Maximum ${this.maxCartelasPerPlayer} cartela${this.maxCartelasPerPlayer > 1 ? 's' : ''} allowed per player! Tap an already chosen card to deselect.`,
      };
    }

    // Check balance
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    const totalAvailable = (user.playWallet || 0) + (user.mainWallet || 0);
    if (totalAvailable < this.stake) {
      return {
        success: false,
        error: `Insufficient funds (${totalAvailable} ETB). Stake is ${this.stake} ETB. Please top up your wallet!`,
      };
    }

    // Deduct stake from playWallet first, then mainWallet if needed
    if ((user.playWallet || 0) >= this.stake) {
      user.playWallet -= this.stake;
    } else {
      const rem = this.stake - (user.playWallet || 0);
      user.playWallet = 0;
      user.mainWallet = Math.max(0, (user.mainWallet || 0) - rem);
    }
    user.gamesPlayed = (user.gamesPlayed || 0) + 1;
    this.saveUsers();

    this.takenCartelas.set(cartelaId, {
      userId,
      username: user.username,
      isBot: false,
      cartela: CARTELAS[cartelaId],
    });

    // Notify user of immediate wallet deduction
    this.io.to(`user_${userId}`).emit('wallet_updated', {
      userId: user.id,
      mainWallet: user.mainWallet,
      playWallet: user.playWallet,
    });

    this.io.emit('cartela_updated', {
      cartelaId,
      action: 'selected',
      userId,
      username: user.username,
      takenCartelas: this.getTakenCartelaIds(),
      derash: this.getDerash(),
      playerCount: this.takenCartelas.size,
    });

    return {
      success: true,
      action: 'selected',
      cartela: CARTELAS[cartelaId],
      balance: user.playWallet,
      mainWallet: user.mainWallet,
    };
  }

  // Manual claim Bingo
  claimBingo(userId, cartelaId) {
    if (this.state !== 'PLAYING') return { success: false, error: 'Game is not currently active' };
    const entry = this.takenCartelas.get(cartelaId);
    if (!entry || entry.userId !== userId) {
      return { success: false, error: 'You do not own this cartela' };
    }

    const check = checkBingo(entry.cartela, this.calledSet);
    if (check.won) {
      this.endGame([{
        userId,
        username: entry.username,
        cartelaId,
        pattern: check.pattern,
        winningCells: check.winningCells,
        grid: entry.cartela.grid,
        isBot: false,
      }]);
      return { success: true, message: 'BINGO Confirmed!' };
    } else {
      return { success: false, error: 'False Bingo! Look closely at called numbers.' };
    }
  }

  setMaxCartelasPerPlayer(count) {
    this.maxCartelasPerPlayer = Math.max(1, Math.min(10, parseInt(count) || 3));
    this.io.emit('game_settings_updated', {
      maxCartelasPerPlayer: this.maxCartelasPerPlayer,
      totalCartelas: this.totalCartelas,
      simulatedBotCount: this.simulatedBotCount,
      voiceLanguage: this.voiceLanguage,
    });
    return this.maxCartelasPerPlayer;
  }

  setTotalCartelas(count) {
    this.totalCartelas = Math.max(10, Math.min(300, parseInt(count) || 100));
    this.io.emit('game_settings_updated', {
      totalCartelas: this.totalCartelas,
      simulatedBotCount: this.simulatedBotCount,
      voiceLanguage: this.voiceLanguage,
      maxCartelasPerPlayer: this.maxCartelasPerPlayer,
    });
    return this.totalCartelas;
  }

  setSimulatedBotCount(count) {
    this.simulatedBotCount = Math.max(0, Math.min(this.totalCartelas, parseInt(count) || 20));
    if (this.enableSimulation && this.state === 'SELECTION') {
      this.seedBotCartelas();
      this.io.emit('cartela_updated', {
        takenCartelas: this.getTakenCartelaIds(),
        derash: this.getDerash(),
        playerCount: this.takenCartelas.size,
      });
    }
    this.io.emit('game_settings_updated', {
      totalCartelas: this.totalCartelas,
      simulatedBotCount: this.simulatedBotCount,
      voiceLanguage: this.voiceLanguage,
      maxCartelasPerPlayer: this.maxCartelasPerPlayer,
    });
    return this.simulatedBotCount;
  }

  setVoiceLanguage(lang) {
    this.voiceLanguage = lang === 'en' ? 'en' : 'am';
    this.io.emit('game_settings_updated', {
      voiceLanguage: this.voiceLanguage,
      voiceGender: this.voiceGender,
      totalCartelas: this.totalCartelas,
      simulatedBotCount: this.simulatedBotCount,
      maxCartelasPerPlayer: this.maxCartelasPerPlayer,
    });
    return this.voiceLanguage;
  }

  setVoiceGender(gender) {
    this.voiceGender = gender === 'male' || gender === 'man' ? 'male' : 'female';
    this.io.emit('game_settings_updated', {
      voiceLanguage: this.voiceLanguage,
      voiceGender: this.voiceGender,
      totalCartelas: this.totalCartelas,
      simulatedBotCount: this.simulatedBotCount,
      maxCartelasPerPlayer: this.maxCartelasPerPlayer,
    });
    return this.voiceGender;
  }

  setSimulation(enabled) {
    this.enableSimulation = Boolean(enabled);
    if (!this.enableSimulation && this.state === 'SELECTION') {
      for (const [cid, entry] of this.takenCartelas.entries()) {
        if (entry.isBot) {
          this.takenCartelas.delete(cid);
        }
      }
      this.io.emit('cartela_updated', {
        takenCartelas: this.getTakenCartelaIds(),
        derash: this.getDerash(),
        playerCount: this.takenCartelas.size,
      });
    } else if (this.enableSimulation && this.state === 'SELECTION') {
      this.seedBotCartelas();
      this.io.emit('cartela_updated', {
        takenCartelas: this.getTakenCartelaIds(),
        derash: this.getDerash(),
        playerCount: this.takenCartelas.size,
      });
    }
    this.io.emit('simulation_updated', { enableSimulation: this.enableSimulation });
    return this.enableSimulation;
  }

  getClientState(userId) {
    const user = userId ? this.users.get(userId) : null;
    const userCartelas = [];
    if (userId) {
      for (const [cid, entry] of this.takenCartelas.entries()) {
        if (entry.userId === userId) {
          userCartelas.push({
            id: cid,
            grid: entry.cartela.grid,
          });
        }
      }
    }

    const derash = this.getDerash();
    const grossPool = Math.max(this.takenCartelas.size, 1) * this.stake;
    const houseCutPercent = Math.round(this.houseCut * 100);

    return {
      gameId: this.gameId,
      state: this.state,
      countdown: this.countdown,
      stake: this.stake,
      derash,
      grossPool,
      houseCutPercent,
      possibleWin: derash,
      playersCount: this.takenCartelas.size,
      calledCount: this.calledBalls.length,
      currentBall: this.currentBall,
      recentBalls: this.calledBalls.slice(0, 4),
      allCalledNumbers: Array.from(this.calledSet),
      takenCartelas: this.getTakenCartelaIds(),
      userCartelas,
      winners: this.winners,
      enableSimulation: this.enableSimulation,
      maxCartelasPerPlayer: this.maxCartelasPerPlayer,
      totalCartelas: this.totalCartelas,
      simulatedBotCount: this.simulatedBotCount,
      voiceLanguage: this.voiceLanguage,
      voiceGender: this.voiceGender,
      bonusSettings: this.bonusSettings,
      user: user
        ? {
            id: user.id,
            username: user.username,
            mainWallet: user.mainWallet,
            playWallet: user.playWallet,
            referralsCount: user.referralsCount || 0,
            referredBy: user.referredBy || null,
          }
        : null,
    };
  }

  broadcastState() {
    const derash = this.getDerash();
    const grossPool = Math.max(this.takenCartelas.size, 1) * this.stake;
    const houseCutPercent = Math.round(this.houseCut * 100);

    this.io.emit('game_state', {
      gameId: this.gameId,
      state: this.state,
      countdown: this.countdown,
      stake: this.stake,
      derash,
      grossPool,
      houseCutPercent,
      possibleWin: derash,
      playersCount: this.takenCartelas.size,
      calledCount: this.calledBalls.length,
      currentBall: this.currentBall,
      recentBalls: this.calledBalls.slice(0, 4),
      allCalledNumbers: Array.from(this.calledSet),
      takenCartelas: this.getTakenCartelaIds(),
      enableSimulation: this.enableSimulation,
      maxCartelasPerPlayer: this.maxCartelasPerPlayer,
      totalCartelas: this.totalCartelas,
      simulatedBotCount: this.simulatedBotCount,
      voiceLanguage: this.voiceLanguage,
      voiceGender: this.voiceGender,
      winners: this.winners,
    });
  }
}

module.exports = BingoGameEngine;
