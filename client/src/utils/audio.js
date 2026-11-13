// Web Audio API & Human Voice Audio Announcer (Optimized for Telegram WebApp & Mobile)

let audioCtx = null;

export function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Global unlock on first user gesture (pointerdown / touch / click)
let isAudioUnlocked = false;
export function unlockAudio() {
  if (isAudioUnlocked) return;
  isAudioUnlocked = true;

  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Unlock HTML5 Audio in Telegram WebApp
    const dummy = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    dummy.volume = 0.01;
    dummy.play().catch(() => {});
  } catch (e) {}
}

// Amharic Bingo Translation
const AMHARIC_LETTERS = {
  B: 'ቢ',
  I: 'አይ',
  N: 'ኤን',
  G: 'ጂ',
  O: 'ኦ',
};

const AMHARIC_ONES = ['', 'አንድ', 'ሁለት', 'ሦስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
const AMHARIC_TEENS = {
  10: 'አስር',
  11: 'አስራ አንድ',
  12: 'አስራ ሁለት',
  13: 'አስራ ሦስት',
  14: 'አስራ አራት',
  15: 'አስራ አምስት',
  16: 'አስራ ስድስት',
  17: 'አስራ ሰባት',
  18: 'አስራ ስምንት',
  19: 'አስራ ዘጠኝ',
};
const AMHARIC_TENS = {
  20: 'ሃያ',
  30: 'ሰላሳ',
  40: 'አርባ',
  50: 'ሃምሳ',
  60: 'ስድሳ',
  70: 'ሰባ',
};

export function numberToAmharicWords(num) {
  const n = parseInt(num);
  if (n <= 0 || isNaN(n)) return '';
  if (n < 10) return AMHARIC_ONES[n];
  if (n >= 10 && n <= 19) return AMHARIC_TEENS[n];

  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;
  const tensWord = AMHARIC_TENS[tens] || '';
  if (ones === 0) return tensWord;
  return `${tensWord} ${AMHARIC_ONES[ones]}`;
}

export function formatBallAmharic(ballFormatted) {
  if (!ballFormatted) return '';
  const parts = ballFormatted.split('-');
  if (parts.length < 2) return ballFormatted;
  const letter = parts[0].toUpperCase();
  const num = parseInt(parts[1]);
  const amharicLetter = AMHARIC_LETTERS[letter] || letter;
  const amharicNum = numberToAmharicWords(num);
  return `${amharicLetter} ${amharicNum}`;
}

// Warm acoustic announcement chime
export function playCallChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

export function playBallPop() {
  playCallChime();
}

// Play click sound on cartela select
export function playClickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

// Fanfare when Bingo is hit!
export function playBingoFanfare() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0.35, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.12 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
    });
  } catch (e) {}
}

// Active audio element reference to prevent audio overlap
let currentCallAudio = null;

// Real Human Voice Announcer (Plays 100% reliably in Telegram WebApp & all phones!)
export function announceBall(ballFormatted, lang = 'am', gender = 'female') {
  if (!ballFormatted || lang === 'mute') return;

  const targetLang = lang === 'en' ? 'en' : 'am';
  const targetGender = gender === 'male' || gender === 'man' ? 'male' : 'female';

  try {
    if (currentCallAudio) {
      currentCallAudio.pause();
      currentCallAudio.currentTime = 0;
    }

    const audioUrl = `/api/voice/ball/${encodeURIComponent(ballFormatted)}?lang=${targetLang}&gender=${targetGender}&v=2`;
    currentCallAudio = new Audio(audioUrl);
    currentCallAudio.volume = 1.0;

    const playPromise = currentCallAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio play prevented, playing acoustic chime fallback:', err);
        playCallChime();
      });
    }
  } catch (e) {
    playCallChime();
  }
}

// Announce BINGO when a round completes
export function announceBingo(lang = 'am', gender = 'female') {
  if (lang === 'mute') return;

  const targetLang = lang === 'en' ? 'en' : 'am';
  const targetGender = gender === 'male' || gender === 'man' ? 'male' : 'female';

  try {
    if (currentCallAudio) {
      currentCallAudio.pause();
      currentCallAudio.currentTime = 0;
    }

    const audioUrl = `/api/voice/ball/bingo?lang=${targetLang}&gender=${targetGender}&v=1`;
    currentCallAudio = new Audio(audioUrl);
    currentCallAudio.volume = 1.0;

    const playPromise = currentCallAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Bingo audio play error:', err);
      });
    }
  } catch (e) {}
}

// ----------------------------------------------------
// TRANSACTION NOTIFICATION SOUNDS (Deposit & Withdrawal)
// ----------------------------------------------------

/**
 * Play a high-pitched, satisfying "Cash In / Coin Register" chime
 * Triggered on new incoming deposit requests or deposit approvals
 */
export function playDepositAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    // Trigger subtle phone vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([120, 60, 150]);
    }

    const startTime = ctx.currentTime;
    // Chime chord sequence: B5 -> E6 -> G#6 -> B6 (bright major chord)
    const notes = [
      { freq: 987.77, delay: 0.0, dur: 0.35, gain: 0.3 },
      { freq: 1318.51, delay: 0.08, dur: 0.4, gain: 0.35 },
      { freq: 1661.22, delay: 0.16, dur: 0.45, gain: 0.35 },
      { freq: 1975.53, delay: 0.24, dur: 0.6, gain: 0.4 },
    ];

    notes.forEach(({ freq, delay, dur, gain: noteGain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime + delay);

      gainNode.gain.setValueAtTime(noteGain, startTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + delay + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime + delay);
      osc.stop(startTime + delay + dur);
    });
  } catch (e) {
    console.warn('Error playing deposit alert sound:', e);
  }
}

/**
 * Play an attention-grabbing, two-tone "Cashier Action Needed" chime
 * Triggered on incoming withdrawal requests or cashout approvals
 */
export function playWithdrawalAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    // Trigger subtle phone vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([180, 80, 180]);
    }

    const startTime = ctx.currentTime;
    // Attention chime: E5 -> G5 -> C6 -> E6
    const notes = [
      { freq: 659.25, delay: 0.0, dur: 0.25, gain: 0.35 },
      { freq: 783.99, delay: 0.1, dur: 0.25, gain: 0.35 },
      { freq: 1046.5, delay: 0.2, dur: 0.35, gain: 0.4 },
      { freq: 1318.51, delay: 0.32, dur: 0.65, gain: 0.45 },
    ];

    notes.forEach(({ freq, delay, dur, gain: noteGain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + delay);

      gainNode.gain.setValueAtTime(noteGain, startTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + delay + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime + delay);
      osc.stop(startTime + delay + dur);
    });
  } catch (e) {
    console.warn('Error playing withdrawal alert sound:', e);
  }
}
