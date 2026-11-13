const { Bot, InlineKeyboard } = require('grammy');

function setupTelegramBot(token, miniAppUrl, adminService, bankService, io, gameEngine) {
  if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN') {
    console.log('⚠️ [Telegram Bot] No valid TELEGRAM_BOT_TOKEN provided. Running in Standalone / Web App mode.');
    return { bot: null, notifyAgentOnDeposit: () => {} };
  }

  const engine = gameEngine || adminService?.gameEngine;

  try {
    const bot = new Bot(token);

    // Track active agents when they chat with the bot
    bot.use(async (ctx, next) => {
      const username = ctx.from?.username?.toLowerCase();
      if (username && adminService?.agents) {
        const matchedAgent = adminService.agents.find(
          (a) => a.telegramUsername?.toLowerCase() === username
        );
        if (matchedAgent) {
          matchedAgent.telegramChatId = ctx.chat.id;
        }
      }
      await next();
    });

    // Callback Query Handler: Instant One-Tap Deposit Approval or Rejection in Telegram
    bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      if (data.startsWith('agent_approve:')) {
        const txId = data.split(':')[1];
        const username = ctx.from?.username?.toLowerCase();
        const agent =
          (adminService?.agents &&
            adminService.agents.find(
              (a) => a.telegramUsername?.toLowerCase() === username || a.telegramChatId === ctx.chat?.id
            )) ||
          adminService.agents[0];

        if (!agent) {
          await ctx.answerCallbackQuery({ text: 'Agent record not found', show_alert: true });
          return;
        }

        const result = adminService.agentVerifyDeposit(agent.id, txId);
        if (result.success) {
          if (io) {
            io.emit('wallet_updated', {
              userId: result.userId,
              mainWallet: result.playerMainWallet,
              message: `✅ ተቀማጭዎ ${result.transaction.amount} ETB በወኪል ${agent.name} ጸድቋል!`,
            });
            io.emit('agent_dashboard_updated', { agentId: agent.id });
            io.emit('transactions_updated');
          }
          await ctx.answerCallbackQuery({
            text: `✅ ተቀማጩ ጸድቋል! (+${result.commissionEarned} ETB ኮሚሽን)`,
          });
          await ctx.editMessageText(
            `✅ *ተቀማጩ በተሳካ ሁኔታ ጸድቋል!*\n\n💰 መጠን፡ *${result.transaction.amount} ETB*\n👤 ተጫዋች፡ ${result.transaction.username} (#${result.userId})\n👨‍💼 ያረጋገጠው ወኪል፡ ${agent.name}\n🎁 ያገኙት ኮሚሽን፡ *+${result.commissionEarned} ETB*\n\nየተጫዋቹ ሂሳብ ወዲያውኑ ወደ ጨዋታው ገብቷል! 🙏`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await ctx.answerCallbackQuery({ text: `❌ ${result.error}`, show_alert: true });
        }
      } else if (data.startsWith('agent_reject:')) {
        const txId = data.split(':')[1];
        const username = ctx.from?.username?.toLowerCase();
        const agent =
          (adminService?.agents &&
            adminService.agents.find(
              (a) => a.telegramUsername?.toLowerCase() === username || a.telegramChatId === ctx.chat?.id
            )) ||
          adminService.agents[0];

        const result = adminService.agentRejectDeposit(agent.id, txId);
        if (result.success) {
          if (io) {
            io.emit('transactions_updated');
            io.emit('agent_dashboard_updated', { agentId: agent.id });
          }
          await ctx.answerCallbackQuery({ text: '❌ ተቀማጩ ውድቅ ተደርጓል!' });
          await ctx.editMessageText(
            `❌ *ተቀማጩ ውድቅ ተደርጓል*\n\nተቀማጭ #${txId} በወኪል ${agent.name} ውድቅ ተደርጓል።`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await ctx.answerCallbackQuery({ text: `❌ ${result.error}`, show_alert: true });
        }
      }
    });

    bot.command('start', async (ctx) => {
      const name = ctx.from?.first_name || 'Player';
      const referralPayload = ctx.match ? ctx.match.trim() : null;
      
      const userData = {
        id: ctx.from?.id,
        username: ctx.from?.username,
        first_name: ctx.from?.first_name,
      };

      const user = engine ? engine.getOrCreateUser(userData, referralPayload) : null;
      const bonusSettings = engine ? engine.bonusSettings : null;

      let bonusNotice = '';
      if (bonusSettings) {
        bonusNotice = `\n🎁 *የመጀመሪያ ምዝገባ ቦነስ ተበርክቶሎታል:*\n• 🎮 *Play Account:* ${user?.playWallet ?? bonusSettings.firstJoin.playAmount} ETB\n• 💳 *Main Account (Acc):* ${user?.mainWallet ?? bonusSettings.firstJoin.accAmount} ETB\n`;
        if (user?.referralBonus) {
          bonusNotice += `\n🤝 *በጓደኛዎ @${user.referralBonus.referrerName} ግብዣ ምክንያት ተጨማሪ የግብዣ ቦነስ ተበርክቶሎታል!*\n`;
        }
      }

      // If user was newly invited by a valid referrer, notify the referrer
      if (user?.referredBy && bot) {
        const referrer = engine.users.get(String(user.referredBy));
        if (referrer && (referrer.telegramId || referrer.telegramChatId)) {
          const chatId = referrer.telegramChatId || referrer.telegramId;
          const invPlay = bonusSettings?.invitation?.inviterPlayAmount || 20;
          const invAcc = bonusSettings?.invitation?.inviterAccAmount || 5;
          bot.api.sendMessage(
            chatId,
            `🎉 *አዲስ የግብዣ ሽልማት (New Referral Reward)!*\n\nጓደኛዎ *${user.username || user.firstName}* ግብዣዎን ተቀብለው ተቀላቅለዋል!\n\n💰 *ወደ ሂሳብዎ የተጨመረ:*\n• 🎮 Play Account: *+${invPlay} ETB*\n• 💳 Main Account (Acc): *+${invAcc} ETB*\n\nአሁን አጠቃላይ ሂሳብዎ፦\n🎮 Play: *${referrer.playWallet} ETB* | 💳 Main: *${referrer.mainWallet} ETB*\n\nተጨማሪ ጓደኞችን በመጋበዝ የበለጠ ያግኙ! 🚀`,
            { parse_mode: 'Markdown' }
          ).catch(() => {});
        }
      }

      const welcomeText = `👋 *እንኳን ደህና መጡ ወደ AFRO BINGO (አፍሮ ቢንጎ)!*
Welcome to *AFRO BINGO* — The #1 Ethiopian Multiplayer Bingo Game! 🇪🇹🎉
${bonusNotice}
✨ *Game Highlights:*
• ⚡ Fast-paced 75-Ball Live Rounds
• 💰 High Derash (Jackpot) payouts
• 🎯 Instant auto-daubing & live voice announcer
• 💳 Telebirr & CBE Birr seamless integration
• 🤝 Verified Telegram Cashiers & Agents

Tap the button below to launch the game directly inside Telegram! 👇`;

      const supportUser = (engine?.supportSettings?.telegramUsername || 'afrobingo_support').replace(/^@/, '');
      const supportGroup = engine?.supportSettings?.supportGroup || 'https://t.me/afrobingo_support';
      const supportChannel = engine?.supportSettings?.supportChannel || 'https://t.me/afrobingo_updates';

      const keyboard = new InlineKeyboard()
        .webApp('🎮 Play Afro Bingo', miniAppUrl)
        .row()
        .webApp('💳 Deposit (ዲፖዚት)', miniAppUrl)
        .webApp('👑 Admin', `${miniAppUrl}?admin=true`)
        .row()
        .url('📢 Channel & Updates', supportChannel)
        .url('💬 Support Desk', `https://t.me/${supportUser}`);

      await ctx.reply(welcomeText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    });

    // Support & Help Command
    bot.command(['support', 'help', 'contact'], async (ctx) => {
      const support = engine?.supportSettings || {
        telegramUsername: 'afrobingo_support',
        phone: '+251911445566',
        supportGroup: 'https://t.me/afrobingo_support',
        supportChannel: 'https://t.me/afrobingo_updates',
        title: 'Afro Bingo Customer Support',
        availableHours: '24/7 Live Support',
        notice: 'ያጋጠሞትን ማንኛውንም የክፍያ ወይም የጨዋታ ጥያቄ በቴሌግራም አነጋግሩን። Contact our official support agent for instant assistance.',
      };
      const supportUser = (support.telegramUsername || 'afrobingo_support').replace(/^@/, '');
      const supportMsg = `🎧 *የደንበኞች ድጋፍ መስጫ (AFRO BINGO Customer Support)*

👤 *Support Officer:* ${support.title || 'Official Support Agent'}
⏰ *Operating Hours:* ${support.availableHours || '24/7 Live Support'}
📞 *Phone / SMS:* \`${support.phone || 'N/A'}\`
💬 *Direct Telegram:* @${supportUser}

ℹ️ *መረጃ (Notice):*
_${support.notice || 'ያጋጠሞትን ማንኛውንም የክፍያ ወይም የጨዋታ ጥያቄ በቴሌግራም አነጋግሩን።'}_`;

      const kb = new InlineKeyboard()
        .url('💬 Direct Message Support User', `https://t.me/${supportUser}`)
        .row();
      if (support.supportGroup) {
        kb.url('👥 Join Support Group', support.supportGroup);
      }
      if (support.supportChannel) {
        kb.url('📢 News & Updates', support.supportChannel);
      }

      await ctx.reply(supportMsg, { parse_mode: 'Markdown', reply_markup: kb });
    });

    // Invitation & Referral Command
    bot.command(['invite', 'referral', 'bonus'], async (ctx) => {
      const userId = ctx.from?.id;
      const user = engine && userId ? engine.users.get(String(userId)) : null;
      const bonusSettings = engine?.bonusSettings;
      const botInfo = await ctx.api.getMe().catch(() => ({ username: 'afrima_bingo_bot' }));
      const botUser = botInfo.username || 'afrima_bingo_bot';
      const inviteLink = `https://t.me/${botUser}?start=ref_${userId}`;
      const referralsCount = user?.referralsCount || 0;

      const invPlay = bonusSettings?.invitation?.inviterPlayAmount ?? 20;
      const invAcc = bonusSettings?.invitation?.inviterAccAmount ?? 5;
      const friendPlay = (bonusSettings?.firstJoin?.playAmount ?? 50) + (bonusSettings?.invitation?.friendPlayAmount ?? 15);
      const friendAcc = (bonusSettings?.firstJoin?.accAmount ?? 0) + (bonusSettings?.invitation?.friendAccAmount ?? 0);

      const msg = `🎁 *የጓደኛ መጋበዣ እና ቦነስ (Invite Friends & Earn Rewards)*

የእርስዎ ልዩ የመጋበዣ ሊንክ፦
\`${inviteLink}\`

━━━━━━━━━━━━━━━━━━━━
💰 *የግብዣ ሽልማት ክፍፍል (Reward Rates):*
• 👤 *እርስዎ የሚያገኙት (ለእያንዳንዱ ጓደኛ):*
  🎮 Play Account: *+${invPlay} ETB*
  💳 Main Account (Acc): *+${invAcc} ETB*

• 👥 *የተጋባዡ ጓደኛዎ የሚያገኘው (Welcome Bonus):*
  🎮 Play Account: *+${friendPlay} ETB*
  💳 Main Account (Acc): *+${friendAcc} ETB*

👥 *እስካሁን የጋበዟቸው ጓደኞች:* ${referralsCount} ሰዎች
━━━━━━━━━━━━━━━━━━━━
ሊንኩን ለጓደኞችዎ ያጋሩ፤ አብረው ይጫወቱ፤ አብረው ያሸንፉ! 🇪🇹🎉`;

      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('🎮 ኑ አብረን በአፍሮ ቢንጎ (AFRO BINGO) እንጫወት እና እናሸንፍ! ተመዝግበው የቦነስ ስጦታዎን ይቀበሉ! 🇪🇹🔥')}`;

      const keyboard = new InlineKeyboard()
        .url('📤 ጓደኛ ይጋብዙ (Share Link)', shareUrl)
        .row()
        .webApp('🎮 Launch Game', miniAppUrl);

      await ctx.reply(msg, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    });

    bot.command('play', async (ctx) => {
      const keyboard = new InlineKeyboard().webApp('🎮 Launch Game', miniAppUrl);
      await ctx.reply('🎰 Tap below to enter the live Bingo room:', {
        reply_markup: keyboard,
      });
    });

    bot.command('rules', async (ctx) => {
      const rules = `📜 *AFRO BINGO Game Rules:*
1. Select 1 or more Cartelas (cards #1 to #100) before the 35s timer runs out.
2. The caller picks numbered balls (1 to 75: B, I, N, G, O).
3. If any row, column, diagonal, or 4 corners match on your cartela, you hit **BINGO!**
4. The Derash (Prize Pool) is shared among all winners of the round.`;
      await ctx.reply(rules, { parse_mode: 'Markdown' });
    });

    // Dynamic Payment & Bank Accounts managed by Admin
    bot.command(['wallet', 'deposit'], async (ctx) => {
      const activeBanks = bankService ? bankService.getPublicBanks() : [];
      let bankListText = '';

      if (activeBanks.length > 0) {
        bankListText = activeBanks
          .map((b) => {
            const badge = b.badge ? ` *[${b.badge} BONUS]*` : '';
            return `• *${b.name}:* \`${b.accountNumber}\`
  👤 *ስም:* ${b.recipientName}
  💬 *ወኪል:* @${b.agentTelegram}${badge}`;
          })
          .join('\n\n');
      } else {
        bankListText = '• Telebirr Fast: `0958945066` (@bole_afro_agent)\n• CBEbirr: `0914035732` (@bole_afro_agent)';
      }

      const walletMsg = `💳 *የክፍያ እና የተቀማጭ ሂሳቦች (Deposit & Payment Accounts):*
በአስተዳዳሪው (Admin) የተመዘገቡ ንቁ የክፍያ አማራጮች፦

${bankListText}

━━━━━━━━━━━━━━━━━━━━
⚠️ *ማስጠንቀቂያ:* ክፍያ ሲፈጽሙ የባንክ ሂሳብ ቁጥሩን እና የተቀባይ ስሙን ያረጋግጡ። ገንዘብ ከላኩ በኋላ በጨዋታው ውስጥ *CONFIRM* ሲጫኑ Player IDዎ ወዲያውኑ ወደ ወኪሉ ይላካል!`;

      const keyboard = new InlineKeyboard().webApp('🏦 Open Deposit Screen in Mini App', miniAppUrl);
      await ctx.reply(walletMsg, { parse_mode: 'Markdown', reply_markup: keyboard });
    });

    // Dynamic Withdrawal channels & cashiers managed by Admin
    bot.command('withdraw', async (ctx) => {
      const activeWithdrawalBanks = bankService ? bankService.getPublicWithdrawalBanks() : [];
      let listText = '';

      if (activeWithdrawalBanks.length > 0) {
        listText = activeWithdrawalBanks
          .map((b) => {
            const cashier = b.withdrawalAgentTelegram || b.agentTelegram || 'bole_afro_agent';
            return `• *${b.name}:*
  💰 መጠን: ${b.minWithdrawal || 50} - ${(b.maxWithdrawal || 25000).toLocaleString()} ETB
  👨‍💼 ካሺር (Cashier): @${cashier}`;
          })
          .join('\n\n');
      } else {
        listText = '• Telebirr Fast (Min 150 ETB) - Cashier: @bole_afro_agent\n• CBEbirr (Min 50 ETB) - Cashier: @bole_afro_agent';
      }

      const withdrawMsg = `💸 *ገንዘብ ማውጫ አማራጮች (Withdrawal Methods & Cashiers):*
በአስተዳዳሪው የተፈቀዱ የማውጫ መንገዶች፦

${listText}

━━━━━━━━━━━━━━━━━━━━
ገንዘብ ለማውጣት በጨዋታው ውስጥ *WALLET ➔ WITHDRAWAL* በመግባት የሂሳብ ቁጥርዎን አስገብተው ይጠይቁ። ጥያቄዎ ወዲያውኑ ወደ ካሺሩ ይላካል!`;

      const keyboard = new InlineKeyboard().webApp('💸 Open Withdrawal in Mini App', miniAppUrl);
      await ctx.reply(withdrawMsg, { parse_mode: 'Markdown', reply_markup: keyboard });
    });

    // Dynamic Agents List managed by Admin
    bot.command(['agents', 'agent'], async (ctx) => {
      const activeAgents = adminService ? adminService.getActiveAgents() : [];
      let agentListText = '';

      if (activeAgents.length > 0) {
        agentListText = activeAgents
          .map((ag, i) => {
            return `${i + 1}. 👤 *${ag.name}*
   📱 *ስልክ:* \`${ag.phone}\`
   🏦 *ባንክ:* ${ag.bankName} (\`${ag.accountNumber}\`)
   💬 *ቴሌግራም:* @${ag.telegramUsername}`;
          })
          .join('\n\n');
      } else {
        agentListText = '• Bole Medhanealem Agent (@bole_afro_agent) - 0911445566\n• Piazza Central Agent (@piazza_bingo_agent) - 0922556677';
      }

      const agentMsg = `🤝 *የተረጋገጡ የቢንጎ ወኪሎች (Official Bingo Agents):*
ገንዘብ ለማስገባት (Deposit) ወይም ለማውጣት (Withdraw) ከታች ያሉትን ወኪሎች በቴሌግራም ማግኘት ይችላሉ፦

${agentListText}

━━━━━━━━━━━━━━━━━━━━
የወኪል ፖርታል ለመክፈት ከታች ያለውን አዝራር ይጫኑ።`;

      const keyboard = new InlineKeyboard()
        .webApp('🤝 Open Agent Portal', `${miniAppUrl}?agent=true`)
        .row()
        .webApp('🎮 Play Afro Bingo', miniAppUrl);

      await ctx.reply(agentMsg, { parse_mode: 'Markdown', reply_markup: keyboard });
    });

    bot.command('admin', async (ctx) => {
      const adminKeyboard = new InlineKeyboard().webApp('👑 Open Admin Console', `${miniAppUrl}?admin=true`);
      await ctx.reply(
        `👑 *Afro Bingo Admin & Cashier Portal:*
Manage payment approvals (Telebirr / CBE), payment settings & bank accounts, agents (ወኪሎች), and game rules.
Default Admin PIN: \`admin123\``,
        {
          parse_mode: 'Markdown',
          reply_markup: adminKeyboard,
        }
      );
    });

    bot.start({
      onStart: async (botInfo) => {
        console.log(`🤖 [Telegram Bot] @${botInfo.username} started successfully!`);
        try {
          await bot.api.setChatMenuButton({
            menu_button: {
              type: 'web_app',
              text: '🎮 Play Bingo',
              web_app: { url: miniAppUrl },
            },
          });
          console.log(`✅ [Telegram Bot] Menu button configured with ${miniAppUrl}`);
        } catch (e) {
          console.warn('⚠️ Could not set menu button:', e.message);
        }
      },
    }).catch((err) => {
      console.warn('⚠️ [Telegram Bot] Failed to connect with Telegram API:', err.message);
    });

    function notifyAgentOnDeposit(tx) {
      if (!bot || !adminService?.agents) return;
      const agent = adminService.agents.find(
        (a) =>
          a.id === tx.agentId ||
          a.telegramUsername?.toLowerCase() === tx.agentTelegram?.toLowerCase()
      );
      if (agent && agent.telegramChatId) {
        const keyboard = new InlineKeyboard()
          .text(`✅ Approve (${tx.amount} ETB)`, `agent_approve:${tx.id}`)
          .text(`❌ Reject`, `agent_reject:${tx.id}`)
          .row()
          .webApp('🤝 Open Agent Portal', `${miniAppUrl}?agent=true`);

        bot.api
          .sendMessage(
            agent.telegramChatId,
            `🔔 *አዲስ የቢንጎ ተቀማጭ ጥያቄ (New Deposit Request)*\n━━━━━━━━━━━━━━━━━━━━━\n👤 *ተጫዋች (Player):* ${tx.username} (\`#${tx.userId}\`)\n💰 *የተላከው መጠን (Amount):* *${tx.amount} ETB*\n🏦 *የባንክ ዘዴ (Bank):* ${tx.provider}\n📱 *የተላከበት ስልክ (Sender Phone):* \`${tx.accountNumber}\`\n🔢 *የትራንዛክሽን ኮድ (Ref):* \`${tx.referenceCode}\`\n━━━━━━━━━━━━━━━━━━━━━\nገንዘቡ በባንክዎ/ቴሌብር መግባቱን ያረጋግጡና ከታች ያለውን አዝራር በመጫን ወዲያውኑ ያስገቡለታል!`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
          )
          .catch(() => {});
      }
    }

    return { bot, notifyAgentOnDeposit };
  } catch (err) {
    console.error('❌ [Telegram Bot] Failed to initialize bot:', err.message);
    return { bot: null, notifyAgentOnDeposit: () => {} };
  }
}

module.exports = { setupTelegramBot };
