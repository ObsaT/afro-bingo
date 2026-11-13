import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  Building2,
  Phone,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export default function BankWithdrawalModal({ user, onClose }) {
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [copiedField, setCopiedField] = useState('');
  const [amount, setAmount] = useState('150');
  const [accountNumber, setAccountNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const playerId = user?.id || '';

  // Fetch active withdrawal methods configured by Admin
  useEffect(() => {
    fetch('/api/banks/withdrawal')
      .then((r) => r.json())
      .then((data) => {
        if (data.banks && data.banks.length > 0) {
          setMethods(data.banks);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleOpenMethod = (method) => {
    setSelectedMethod(method);
    setAmount(String(method.minWithdrawal || 50));
    setAccountNumber('');
    setFullName('');
    setFeedback(null);
    setErrors({});
  };

  const validateWithdrawalForm = () => {
    const errs = {};
    const min = selectedMethod?.minWithdrawal || 50;
    const max = selectedMethod?.maxWithdrawal || 50000;
    const num = parseFloat(amount);
    const userBalance = user?.mainWallet || 0;

    // 1. Amount validation
    if (!amount || isNaN(num) || num <= 0) {
      errs.amount = 'እባክዎ ትክክለኛ የገንዘብ መጠን ያስገቡ (Please enter a valid amount)';
    } else if (num < min) {
      errs.amount = `ዝቅተኛው የማውጣት መጠን ${min.toLocaleString()} ETB ነው (Minimum is ${min} ETB)`;
    } else if (num > max) {
      errs.amount = `ከፍተኛው የማውጣት መጠን ${max.toLocaleString()} ETB ነው (Maximum is ${max.toLocaleString()} ETB)`;
    } else if (num > userBalance) {
      errs.amount = `በቂ ቀሪ ሂሳብ የለዎትም (Insufficient balance). Current balance: ${userBalance.toLocaleString()} ETB`;
    }

    // 2. Account / Phone Number validation
    const cleanAcc = accountNumber.trim().replace(/\s+/g, '');
    const isMobileMoney =
      ['telebirr', 'cbe_birr', 'ebirr'].includes(selectedMethod?.logoType) ||
      selectedMethod?.name?.toLowerCase().includes('telebirr') ||
      selectedMethod?.name?.toLowerCase().includes('birr');

    if (!cleanAcc) {
      errs.accountNumber = isMobileMoney
        ? 'እባክዎ የእርስዎን ስልክ ቁጥር ያስገቡ (Please enter your phone number)'
        : 'እባክዎ የእርስዎን የባንክ ሂሳብ ቁጥር ያስገቡ (Please enter your account number)';
    } else if (isMobileMoney) {
      const ethPhoneRegex = /^(?:\+?251|0)?[79]\d{8}$/;
      if (!ethPhoneRegex.test(cleanAcc)) {
        errs.accountNumber = 'ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ (ለምሳሌ 09XXXXXXXX ወይም 07XXXXXXXX)';
      }
    } else {
      const bankAccRegex = /^\d{8,18}$/;
      if (!bankAccRegex.test(cleanAcc)) {
        errs.accountNumber = 'ትክክለኛ የባንክ ሂሳብ ቁጥር ያስገቡ (ከ8-18 ድጅት)';
      }
    }

    // 3. Full Name validation (Must be at least 2 words)
    const nameWords = fullName.trim().split(/\s+/).filter(Boolean);
    if (!fullName.trim()) {
      errs.fullName = 'የገንዘብ ተቀባይ ሙሉ ስም ያስገቡ (Please enter recipient full name)';
    } else if (nameWords.length < 2) {
      errs.fullName = 'እባክዎ ቢያንስ የመጀመሪያ እና የአባት ስም ያስገቡ (ለምሳሌ Abebe Balcha)';
    } else if (fullName.trim().length < 4) {
      errs.fullName = 'ሙሉ ስም ቢያንስ 4 ፊደላት መሆን አለበት';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateWithdrawalForm()) {
      return;
    }

    const num = parseFloat(amount);
    setSubmitting(true);

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: playerId,
          amount: num,
          provider: selectedMethod.name,
          bankId: selectedMethod.id,
          accountNumber: accountNumber.trim(),
          fullName: fullName.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setIsSuccess(true);
        setFeedback({
          type: 'success',
          msg: `✅ የማውጣት ጥያቄዎ በተሳካ ሁኔታ ተልኳል (Withdrawal sent successfully)! Opening Cashier Telegram...`,
        });

        // 2. Open Cashier/Agent Telegram deep link behind the scenes
        setTimeout(() => {
          if (data.telegramUrl) {
            window.open(data.telegramUrl, '_blank');
          }
          if (onClose) onClose();
        }, 1500);
      } else {
        alert(data.error || 'Failed to submit withdrawal request');
      }
    } catch (err) {
      alert('Network error while processing withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  const getLogoColor = (logoType) => {
    if (logoType === 'telebirr') return 'text-[#008bd2]';
    if (logoType === 'cbe_birr') return 'text-[#821f57]';
    if (logoType === 'ebirr') return 'text-green-600';
    if (logoType === 'cbe') return 'text-purple-700';
    if (logoType === 'awash') return 'text-orange-600';
    return 'text-gray-900';
  };

  return (
    <div className="flex-1 flex flex-col bg-[#eef2f5] text-gray-800 overflow-y-auto select-none relative pb-10">
      {/* Top Header matching Screenshot 9 */}
      <div className="bg-[#1f242d] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition text-gray-300 hover:text-white"
          >
            ←
          </button>
          <h1 className="text-base font-black tracking-wide uppercase">Withdrawal</h1>
        </div>
        <div className="text-xs text-gray-400 font-mono">
          Main Wallet: {user?.mainWallet ?? 0} ETB
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3 max-w-md mx-auto w-full">
        {/* Account ID & Balance Pill matching Screenshot 4 & 9 */}
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Withdrawing From:</span>
              <span className="text-sm font-black font-mono text-gray-900">{playerId}</span>
            </div>
            <div className="text-[11px] text-gray-600 font-medium mt-1">
              Withdrawable Main Balance: <b className="text-emerald-700 font-mono font-bold">{Number(user?.mainWallet || 0).toFixed(2)} ETB</b>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(String(playerId), 'accountId')}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700 transition active:scale-95"
            title="Copy Account ID"
          >
            {copiedField === 'accountId' ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-600" />
            )}
            <span>{copiedField === 'accountId' ? 'Copied!' : 'Copy ID'}</span>
          </button>
        </div>

        {/* Action pills row */}
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 bg-[#2e5b3c] text-white text-[11px] font-bold rounded">
            Types of payment systems
          </span>

          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
            <span>Confirm via:</span>
            <span className="px-2 py-0.5 bg-green-700 text-white font-bold rounded text-[10px]">SMS</span>
          </div>
        </div>

        {/* Section: BANK TRANSFER matching Screenshot 9 */}
        <div>
          <div className="text-[11px] font-extrabold tracking-wider text-[#2e5b3c] uppercase mb-2">
            Bank Transfer & Mobile Money
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {methods.map((m) => (
              <div
                key={m.id}
                onClick={() => handleOpenMethod(m)}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition active:scale-95 flex flex-col justify-between"
              >
                <div className="h-16 flex items-center justify-center p-2 bg-gray-50/50">
                  <span className={`text-xl font-black ${getLogoColor(m.logoType)}`}>
                    {m.name}
                  </span>
                </div>
                <div className="bg-[#4a4f59] text-white text-center py-1.5 text-xs font-bold truncate px-1">
                  {m.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- WITHDRAWAL MODAL POPUP (Matching Screenshot 10 & 11) --- */}
      {selectedMethod && (
        <div className="fixed inset-0 z-50 bg-black/75 flex flex-col justify-end sm:justify-center items-center backdrop-blur-sm p-2 animate-fade-in overflow-y-auto">
          <div className="bg-white text-gray-800 w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 flex flex-col gap-3 relative max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-2">
              <span className={`text-lg font-black ${getLogoColor(selectedMethod.logoType)}`}>
                {selectedMethod.name}
              </span>
              <button
                onClick={() => setSelectedMethod(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>{feedback.msg}</span>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="font-bold text-gray-700">
                  Amount (Min {selectedMethod.minWithdrawal || 50}.00 ETB / Max {selectedMethod.maxWithdrawal?.toLocaleString() || '50,000'}.00 ETB):
                </span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm font-bold text-gray-900 focus:outline-none transition ${
                  errors.amount
                    ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400'
                    : 'border-gray-300 focus:border-green-600'
                }`}
              />
              {errors.amount && (
                <div className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.amount}</span>
                </div>
              )}
            </div>

            {/* Quick Amount Pills */}
            <div className="grid grid-cols-4 gap-1.5">
              {['100', '250', '500', '1000'].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setAmount(amt);
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                  }}
                  className={`py-1.5 text-xs font-bold border rounded-lg transition ${
                    amount === amt
                      ? 'bg-[#2e5b3c] text-white border-[#2e5b3c]'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* Player's Phone / Account */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <label className="font-bold text-gray-700">
                  {selectedMethod.withdrawalAmharicLabel || 'የእርስዎ ሂሳብ / ስልክ ቁጥር'}:
                </label>
                <span className="text-[10px] text-gray-400 font-mono">
                  {accountNumber.length}/15
                </span>
              </div>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  if (errors.accountNumber) setErrors((prev) => ({ ...prev, accountNumber: '' }));
                }}
                placeholder="09XXXXXXXX"
                className={`w-full px-3 py-2 border rounded-lg text-sm font-mono text-gray-900 focus:outline-none transition ${
                  errors.accountNumber
                    ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400'
                    : 'border-gray-300 focus:border-green-600'
                }`}
              />
              {errors.accountNumber && (
                <div className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.accountNumber}</span>
                </div>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                የገንዘብ ተቀባይ ሙሉ ስም (Recipient Full Name):
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                }}
                placeholder="የአያት ስም የመጀመሪያ ስም"
                className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 focus:outline-none transition ${
                  errors.fullName
                    ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400'
                    : 'border-gray-300 focus:border-green-600'
                }`}
              />
              {errors.fullName && (
                <div className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.fullName}</span>
                </div>
              )}
            </div>

            {/* Calculation Breakdown: Gross, Company Cut Down, Net Payout to Player */}
            {Number(amount) > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 flex flex-col gap-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>የተጠየቀው መጠን (Gross Amount):</span>
                  <span className="font-bold text-gray-800 font-mono">{Number(amount).toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>የድርጅት ቅናሽ (Company Cut 10%):</span>
                  <span className="font-bold font-mono">-{(Number(amount) * 0.10).toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between text-green-700 font-extrabold border-t border-gray-200 pt-1 text-sm">
                  <span>ለእርስዎ የሚላከው (Net Payable):</span>
                  <span className="font-mono text-green-800 font-black">+{(Number(amount) * 0.90).toFixed(2)} ETB</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  የማውጣት ጥያቄው በቀጥታ ለተመደበው ወኪል (@{selectedMethod.withdrawalAgentTelegram || selectedMethod.agentTelegram}) ይላካል።
                </div>
              </div>
            )}

            {/* Cashier attribution note */}
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <span className="font-semibold">Assigned Cashier:</span>
              <span className="font-bold text-blue-600 font-mono">
                @{selectedMethod.withdrawalAgentTelegram || selectedMethod.agentTelegram || 'bole_afro_agent'}
              </span>
            </div>

            {/* Confirm Button matching Screenshot */}
            <button
              onClick={handleConfirm}
              disabled={submitting || isSuccess}
              className={`w-full py-3 text-white font-black text-sm uppercase rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 mt-2 ${
                isSuccess ? 'bg-[#10b981]' : 'bg-[#2e5b3c] hover:bg-[#254d32]'
              }`}
            >
              {submitting ? (
                <span>⏳ በመላክ ላይ... (Sending...)</span>
              ) : isSuccess ? (
                <span>✅ በተሳካ ሁኔታ ተልኳል (Sent Successfully)!</span>
              ) : (
                <span>CONFIRM</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
