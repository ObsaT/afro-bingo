// Bank and Payment Systems Configuration & Management
// Matches Ethiopian betting/gaming payment gateways (Melbet style)
const fs = require('fs');
const path = require('path');

class BankService {
  constructor(adminService) {
    this.adminService = adminService;
    this.dataDir = path.join(__dirname, 'data');
    this.banksFile = path.join(this.dataDir, 'banks.json');

    // Ensure data directory exists
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (e) {}

    // Load banks from disk or initialize
    this.banks = [];
    try {
      if (fs.existsSync(this.banksFile)) {
        this.banks = JSON.parse(fs.readFileSync(this.banksFile, 'utf8'));
      }
    } catch (e) {}

    if (!this.banks || this.banks.length === 0) {
      // Supported Banks and Payment Systems (For Deposit & Withdrawal)
      this.banks = [
        {
          id: 'telebirr_fast',
          name: 'Telebirr Fast',
          category: 'RECOMMENDED',
          accountNumber: '0958945066',
          recipientName: 'Abel haftom gebremichael',
          agentTelegram: 'bole_afro_agent',
          minAmount: 50,
          maxAmount: 15000,
          badge: '',
          enabled: true,
          allowDeposit: true,
          allowWithdrawal: true,
          minWithdrawal: 150,
          maxWithdrawal: 15000,
          withdrawalAgentTelegram: 'bole_afro_agent',
          withdrawalAmharicLabel: 'የእርስዎ ቴሌ ብር ቁጥር',
          logoType: 'telebirr',
          videoUrl: '',
        },
        {
          id: 'cbe_birr',
          name: 'CBEbirr',
          category: 'RECOMMENDED',
          accountNumber: '0914035732',
          recipientName: 'Michele Ayalew Tafere',
          agentTelegram: 'bole_afro_agent',
          minAmount: 25,
          maxAmount: 10000,
          badge: '',
          enabled: true,
          allowDeposit: true,
          allowWithdrawal: true,
          minWithdrawal: 50,
          maxWithdrawal: 10000,
          withdrawalAgentTelegram: 'bole_afro_agent',
          withdrawalAmharicLabel: 'የእርስዎ የሲቢኢ ብር የሂሳብ ቁጥር',
          logoType: 'cbe_birr',
          videoUrl: '',
        },
        {
          id: 'awash_bank',
          name: 'Awash Bank',
          category: 'RECOMMENDED',
          accountNumber: '0130485920194',
          recipientName: 'Nam Bingo PLC',
          agentTelegram: 'piazza_bingo_agent',
          minAmount: 50,
          maxAmount: 25000,
          badge: '10%',
          enabled: true,
          allowDeposit: true,
          allowWithdrawal: true,
          minWithdrawal: 100,
          maxWithdrawal: 25000,
          withdrawalAgentTelegram: 'piazza_bingo_agent',
          withdrawalAmharicLabel: 'የእርስዎ የአዋሽ ባንክ ሂሳብ ቁጥር',
          logoType: 'awash',
          videoUrl: '',
        },
        {
          id: 'bank_of_abyssinia',
          name: 'Bank of Abyssinia',
          category: 'RECOMMENDED',
          accountNumber: '84920194',
          recipientName: 'Nam Bingo PLC',
          agentTelegram: 'piazza_bingo_agent',
          minAmount: 50,
          maxAmount: 50000,
          badge: '20%',
          enabled: true,
          allowDeposit: true,
          allowWithdrawal: false,
          minWithdrawal: 100,
          maxWithdrawal: 50000,
          withdrawalAgentTelegram: 'piazza_bingo_agent',
          withdrawalAmharicLabel: 'የእርስዎ የአቢሲኒያ ባንክ ሂሳብ ቁጥር',
          logoType: 'abyssinia',
          videoUrl: '',
        },
        {
          id: 'cbe_bank',
          name: 'CBE Bank',
          category: 'BANK TRANSFER',
          accountNumber: '1000293847561',
          recipientName: 'Nam Afro Bingo',
          agentTelegram: 'bole_afro_agent',
          minAmount: 50,
          maxAmount: 50000,
          badge: '',
          enabled: true,
          allowDeposit: true,
          allowWithdrawal: true,
          minWithdrawal: 100,
          maxWithdrawal: 50000,
          withdrawalAgentTelegram: 'bole_afro_agent',
          withdrawalAmharicLabel: 'የእርስዎ የንግድ ባንክ ሂሳብ ቁጥር',
          logoType: 'cbe',
          videoUrl: '',
        },
        {
          id: 'coop_bank',
          name: 'COOP BANK',
          category: 'BANK TRANSFER',
          accountNumber: '10004928174',
          recipientName: 'Nam Afro Bingo',
          agentTelegram: 'megenagna_cashier',
          minAmount: 50,
          maxAmount: 30000,
          badge: '',
          enabled: true,
          allowDeposit: true,
          allowWithdrawal: true,
          minWithdrawal: 100,
          maxWithdrawal: 30000,
          withdrawalAgentTelegram: 'megenagna_cashier',
          withdrawalAmharicLabel: 'የእርስዎ የኦሮሚያ ህብረት ስራ ባንክ ሂሳብ ቁጥር',
          logoType: 'coop',
          videoUrl: '',
        },
        {
          id: 'e_birr',
          name: 'E-birr',
          category: 'BANK TRANSFER',
          accountNumber: '0922334455',
          recipientName: 'Michele Ayalew',
          agentTelegram: 'megenagna_cashier',
          minAmount: 50,
          maxAmount: 15000,
          badge: '',
          enabled: true,
          allowDeposit: true,
          allowWithdrawal: true,
          minWithdrawal: 100,
          maxWithdrawal: 15000,
          withdrawalAgentTelegram: 'megenagna_cashier',
          withdrawalAmharicLabel: 'የእርስዎ የኢ-ብር ሂሳብ ቁጥር',
          logoType: 'ebirr',
          videoUrl: '',
        },
      ];
      this.saveBanks();
    }
  }

  saveBanks() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.banksFile, JSON.stringify(this.banks, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save banks to disk:', e);
    }
  }

  // Get all active banks for public player UI (Deposit)
  getPublicBanks() {
    return this.banks.filter((b) => b.enabled && b.allowDeposit !== false);
  }

  // Get all active banks for public player UI (Withdrawal)
  getPublicWithdrawalBanks() {
    return this.banks.filter((b) => b.enabled && b.allowWithdrawal !== false);
  }

  // Get all banks for admin settings
  getAllBanks() {
    return this.banks;
  }

  // Admin updates bank details
  updateBank(bankId, data) {
    const bank = this.banks.find((b) => b.id === bankId);
    if (!bank) return { success: false, error: 'Bank not found' };

    if (data.name !== undefined) bank.name = data.name;
    if (data.accountNumber !== undefined) bank.accountNumber = data.accountNumber;
    if (data.recipientName !== undefined) bank.recipientName = data.recipientName;
    if (data.agentTelegram !== undefined) bank.agentTelegram = data.agentTelegram.replace('@', '');
    if (data.minAmount !== undefined) bank.minAmount = parseInt(data.minAmount) || 25;
    if (data.maxAmount !== undefined) bank.maxAmount = parseInt(data.maxAmount) || 50000;
    if (data.badge !== undefined) bank.badge = data.badge;
    if (data.enabled !== undefined) bank.enabled = Boolean(data.enabled);
    if (data.category !== undefined) bank.category = data.category;
    if (data.allowDeposit !== undefined) bank.allowDeposit = Boolean(data.allowDeposit);
    if (data.allowWithdrawal !== undefined) bank.allowWithdrawal = Boolean(data.allowWithdrawal);
    if (data.minWithdrawal !== undefined) bank.minWithdrawal = parseInt(data.minWithdrawal) || 50;
    if (data.maxWithdrawal !== undefined) bank.maxWithdrawal = parseInt(data.maxWithdrawal) || 50000;
    if (data.withdrawalAgentTelegram !== undefined) {
      bank.withdrawalAgentTelegram = data.withdrawalAgentTelegram.replace('@', '');
    }
    if (data.withdrawalAmharicLabel !== undefined) {
      bank.withdrawalAmharicLabel = data.withdrawalAmharicLabel;
    }

    this.saveBanks();
    return { success: true, bank };
  }

  // Admin adds a new bank
  addBank(data) {
    const id = (data.name || 'bank').toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const newBank = {
      id,
      name: data.name,
      category: data.category || 'BANK TRANSFER',
      accountNumber: data.accountNumber,
      recipientName: data.recipientName,
      agentTelegram: (data.agentTelegram || 'bole_afro_agent').replace('@', ''),
      minAmount: parseInt(data.minAmount) || 50,
      maxAmount: parseInt(data.maxAmount) || 50000,
      badge: data.badge || '',
      enabled: true,
      allowDeposit: data.allowDeposit !== false,
      allowWithdrawal: data.allowWithdrawal !== false,
      minWithdrawal: parseInt(data.minWithdrawal) || 50,
      maxWithdrawal: parseInt(data.maxWithdrawal) || 50000,
      withdrawalAgentTelegram: (data.withdrawalAgentTelegram || data.agentTelegram || 'bole_afro_agent').replace('@', ''),
      withdrawalAmharicLabel: data.withdrawalAmharicLabel || 'የእርስዎ የሂሳብ ቁጥር',
      logoType: data.logoType || 'bank',
      videoUrl: data.videoUrl || '',
    };
    this.banks.push(newBank);
    this.saveBanks();
    return { success: true, bank: newBank };
  }

  // Toggle bank active/inactive
  toggleBank(bankId) {
    const bank = this.banks.find((b) => b.id === bankId);
    if (!bank) return { success: false, error: 'Bank not found' };
    bank.enabled = !bank.enabled;
    this.saveBanks();
    return { success: true, bank };
  }
}

module.exports = BankService;
