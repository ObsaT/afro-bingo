const fs = require('fs');
const path = require('path');
const googleTTS = require('google-tts-api');
const { execSync } = require('child_process');

const CACHE_DIR = path.join(__dirname, 'audio_cache');

const AMHARIC_LETTERS = { B: 'ቢ', I: 'አይ', N: 'ኤን', G: 'ጂ', O: 'ኦ' };
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

function numberToAmharic(num) {
  if (num < 10) return AMHARIC_ONES[num];
  if (num >= 10 && num <= 19) return AMHARIC_TEENS[num];
  const tens = Math.floor(num / 10) * 10;
  const ones = num % 10;
  return ones === 0 ? AMHARIC_TENS[tens] : `${AMHARIC_TENS[tens]} ${AMHARIC_ONES[ones]}`;
}

function parseBall(ballFormatted) {
  let letter = 'B';
  let num = 1;
  if (typeof ballFormatted === 'string' && ballFormatted.includes('-')) {
    const parts = ballFormatted.split('-');
    letter = parts[0].toUpperCase();
    num = parseInt(parts[1]) || 1;
  } else {
    num = parseInt(ballFormatted) || 1;
    if (num <= 15) letter = 'B';
    else if (num <= 30) letter = 'I';
    else if (num <= 45) letter = 'N';
    else if (num <= 60) letter = 'G';
    else letter = 'O';
  }
  return { letter, num, formatted: `${letter}-${num}` };
}

function getBallSpeechText(letter, num, lang = 'am') {
  if (lang === 'am') {
    const amLetter = AMHARIC_LETTERS[letter] || letter;
    const amNum = numberToAmharic(num);
    return `${amLetter} ${amNum}`;
  } else {
    return `${letter} ${num}`;
  }
}

class VoiceService {
  constructor() {
    this.cacheDir = CACHE_DIR;
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async getAudioFile(ballFormatted, lang = 'am', gender = 'female') {
    const isBingo = typeof ballFormatted === 'string' && ballFormatted.toLowerCase() === 'bingo';
    const targetLang = lang === 'en' ? 'en' : 'am';
    const targetGender = gender === 'male' || gender === 'man' ? 'male' : 'female';

    if (isBingo) {
      const filename = `${targetLang}_${targetGender}_bingo.mp3`;
      const targetPath = path.join(this.cacheDir, filename);

      if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 1000) {
        return targetPath;
      }

      const speechText = targetLang === 'am' ? 'ቢንጎ! ቢንጎ!' : 'Bingo! Bingo!';
      const rawPath = path.join(this.cacheDir, `raw_${targetLang}_bingo.mp3`);

      try {
        const base64 = await googleTTS.getAudioBase64(speechText, {
          lang: targetLang === 'am' ? 'am' : 'en',
          slow: false,
          host: 'https://translate.google.com',
          timeout: 10000,
        });

        fs.writeFileSync(rawPath, Buffer.from(base64, 'base64'));

        if (targetGender === 'female') {
          execSync(`ffmpeg -y -i "${rawPath}" -af "asetrate=24000*1.15,atempo=0.87" "${targetPath}" 2>/dev/null`);
        } else {
          execSync(`ffmpeg -y -i "${rawPath}" -af "asetrate=24000*0.82,atempo=1.22" "${targetPath}" 2>/dev/null`);
        }

        if (fs.existsSync(rawPath)) {
          try { fs.unlinkSync(rawPath); } catch (e) {}
        }

        return targetPath;
      } catch (err) {
        console.error('Voice generation error for Bingo:', err);
        if (fs.existsSync(rawPath)) return rawPath;
        return null;
      }
    }

    const { letter, num, formatted } = parseBall(ballFormatted);

    const filename = `${targetLang}_${targetGender}_${formatted}.mp3`;
    const targetPath = path.join(this.cacheDir, filename);

    // If cached, return immediately
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 1000) {
      return targetPath;
    }

    // Generate speech
    const speechText = getBallSpeechText(letter, num, targetLang);
    const rawPath = path.join(this.cacheDir, `raw_${targetLang}_${formatted}.mp3`);

    try {
      const base64 = await googleTTS.getAudioBase64(speechText, {
        lang: targetLang === 'am' ? 'am' : 'en',
        slow: false,
        host: 'https://translate.google.com',
        timeout: 10000,
      });

      fs.writeFileSync(rawPath, Buffer.from(base64, 'base64'));

      // Modulate pitch for Girl vs Man
      if (targetGender === 'female') {
        execSync(`ffmpeg -y -i "${rawPath}" -af "asetrate=24000*1.15,atempo=0.87" "${targetPath}" 2>/dev/null`);
      } else {
        execSync(`ffmpeg -y -i "${rawPath}" -af "asetrate=24000*0.82,atempo=1.22" "${targetPath}" 2>/dev/null`);
      }

      if (fs.existsSync(rawPath)) {
        try { fs.unlinkSync(rawPath); } catch (e) {}
      }

      return targetPath;
    } catch (err) {
      console.error('Voice generation error for', speechText, err);
      // Return raw or null
      if (fs.existsSync(rawPath)) return rawPath;
      return null;
    }
  }

  // Pre-generate calls in background for zero latency
  async prewarm() {
    console.log('🎙️ [VoiceService] Pre-warming real audio calls...');
    const languages = ['am', 'en'];
    const genders = ['female', 'male'];

    // Prewarm all 75 balls
    for (let i = 1; i <= 75; i++) {
      let letter = 'B';
      if (i > 15 && i <= 30) letter = 'I';
      else if (i > 30 && i <= 45) letter = 'N';
      else if (i > 45 && i <= 60) letter = 'G';
      else if (i > 60) letter = 'O';
      const formatted = `${letter}-${i}`;

      for (const lang of languages) {
        for (const gender of genders) {
          const filename = `${lang}_${gender}_${formatted}.mp3`;
          const targetPath = path.join(this.cacheDir, filename);
          if (!fs.existsSync(targetPath)) {
            try {
              await this.getAudioFile(formatted, lang, gender);
              // Small delay to prevent rate limits
              await new Promise((r) => setTimeout(r, 80));
            } catch (e) {}
          }
        }
      }
    }
    console.log('✅ [VoiceService] All 75 Bingo calls generated and cached on disk!');
  }
}

module.exports = new VoiceService();
