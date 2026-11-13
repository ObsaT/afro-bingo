import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Upload,
  AlertTriangle,
  Play,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';

export default function BankDepositModal({
  user,
  onClose,
  onSuccess,
}) {
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState('');
  const [showSupport, setShowSupport] = useState(false);

  // Form State
  const [amount, setAmount] = useState('50');
  const [playerPhone, setPlayerPhone] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState({});

  const playerId = user?.id || '';

  // Fetch Public Banks
  useEffect(() => {
    fetch('/api/banks/public')
      .then((r) => r.json())
      .then((data) => {
        if (data.banks) {
          setBanks(data.banks);
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

  const handleOpenBankModal = (bank) => {
    setSelectedBank(bank);
    setAmount(String(bank.minAmount || 50));
    setPlayerPhone('');
    setReceiptRef('');
    setFeedback(null);
    setErrors({});
  };

  // Validation function
  const validateForm = () => {
    const errs = {};
    const min = selectedBank?.minAmount || 25;
    const max = selectedBank?.maxAmount || 50000;
    const num = parseFloat(amount);

    // 1. Amount validation
    if (!amount || isNaN(num) || num <= 0) {
      errs.amount = 'እባክዎ ትክክለኛ የተቀማጭ ገንዘብ መጠን ያስገቡ (Please enter a valid amount)';
    } else if (num < min) {
      errs.amount = `ዝቅተኛው ተቀማጭ መጠን ${min.toLocaleString()} ETB ነው (Minimum is ${min.toLocaleString()} ETB)`;
    } else if (num > max) {
      errs.amount = `ከፍተኛው ተቀማጭ መጠን ${max.toLocaleString()} ETB ነው (Maximum is ${max.toLocaleString()} ETB)`;
    }

    // 2. Phone / Account validation
    const cleanPhone = playerPhone.trim().replace(/\s+/g, '');
    const isMobileMoney =
      ['telebirr', 'cbe_birr', 'ebirr'].includes(selectedBank?.logoType) ||
      selectedBank?.name?.toLowerCase().includes('telebirr') ||
      selectedBank?.name?.toLowerCase().includes('birr');

    if (!cleanPhone) {
      errs.phone = isMobileMoney
        ? 'እባክዎ የእርስዎን ስልክ ቁጥር ያስገቡ (Please enter your phone number)'
        : 'እባክዎ የእርስዎን የባንክ ሂሳብ ቁጥር ያስገቡ (Please enter your account number)';
    } else if (isMobileMoney) {
      // Must match Ethiopian mobile phone pattern: 09XXXXXXXX, 07XXXXXXXX, or +2519...
      const ethPhoneRegex = /^(?:\+?251|0)?[79]\d{8}$/;
      if (!ethPhoneRegex.test(cleanPhone)) {
        errs.phone = 'ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ (ለምሳሌ 0912345678 ወይም 0712345678)';
      }
    } else {
      // Regular bank account (CBE, Awash, Abyssinia, etc.)
      const bankAccRegex = /^\d{8,18}$/;
      if (!bankAccRegex.test(cleanPhone)) {
        errs.phone = 'ትክክለኛ የባንክ ሂሳብ ቁጥር ያስገቡ (ከ8 እስከ 18 ድጅት ቁጥር)';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit & Behind-the-scenes Telegram dispatch
  const handleConfirm = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/wallet/deposit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: playerId,
          username: user?.username || 'AfroPlayer',
          amount: parseFloat(amount),
          bankId: selectedBank.id,
          playerPhone: playerPhone.trim(),
          receiptRef: receiptRef.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setIsSuccess(true);
        setFeedback({
          type: 'success',
          msg: `✅ ጥያቄዎ በተሳካ ሁኔታ ተልኳል (Sent successfully)! ወደ ወኪል ቴሌግራም እየሄደ ነው...`,
        });

        // 2. Behind the scenes: open Agent's Telegram with prefilled message
        setTimeout(() => {
          if (data.telegramUrl) {
            window.open(data.telegramUrl, '_blank');
          }
          if (onSuccess) onSuccess();
        }, 1200);
      } else {
        alert(data.error || 'Failed to submit deposit');
      }
    } catch (err) {
      alert('Network error while processing deposit');
    } finally {
      setSubmitting(false);
    }
  };

  // Group banks by category
  const recommendedBanks = banks.filter((b) => b.category === 'RECOMMENDED');
  const transferBanks = banks.filter((b) => b.category !== 'RECOMMENDED');

  return (
    <div className="flex-1 flex flex-col bg-[#eef2f5] text-gray-800 overflow-y-auto select-none relative pb-10">
      {/* Top Header matching Screenshot 1 */}
      <div className="bg-[#1f242d] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition text-gray-300 hover:text-white"
          >
            ←
          </button>
          <h1 className="text-base font-black tracking-wide uppercase">Deposit</h1>
        </div>
        <div className="text-xs text-gray-400 font-mono">Nam Afro Bingo</div>
      </div>

      <div className="p-3 flex flex-col gap-3 max-w-md mx-auto w-full">
        {/* Account Info & Balance Card matching Screenshot 1 */}
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Account:</span>
              <span className="text-sm font-black font-mono text-gray-900">{playerId}</span>
            </div>
            <div className="text-[11px] text-gray-600 font-medium mt-1 flex items-center gap-2">
              <span>Main: <b className="text-emerald-700 font-mono font-bold">{Number(user?.mainWallet || 0).toFixed(2)} ETB</b></span>
              <span>•</span>
              <span>Play: <b className="text-amber-700 font-mono font-bold">{Number(user?.playWallet || 0).toFixed(2)} ETB</b></span>
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

        {/* Types of payment systems pill */}
        <div>
          <span className="inline-block px-3 py-1 bg-[#2e5b3c] text-white text-[11px] font-bold rounded">
            Types of payment systems
          </span>
        </div>

        {/* Support Box matching Screenshot 1 */}
        <div className="bg-[#e9ecef] rounded-xl border border-gray-300 overflow-hidden shadow-sm">
          <button
            onClick={() => setShowSupport(!showSupport)}
            className="w-full px-3 py-2.5 flex items-center justify-between text-left font-bold text-xs text-gray-800"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#1f242d] text-white flex items-center justify-center text-xs font-bold">
                !
              </span>
              <span>ድጋፍ ማግኘት (Get Support)</span>
            </div>
            {showSupport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSupport && (
            <div className="px-3 pb-3 pt-1 text-[11px] text-gray-700 leading-relaxed border-t border-gray-300">
              <p className="mb-2">
                Team cash በመጠቀም ከኛጋ ይስሩ:: ለተጠቃሚዎች ገንዘብ ዲፖዚት እና ዊዝድራው በማድረግ ኮሚሽን ያግኙ ::
              </p>
              <div className="flex flex-col gap-1 font-mono text-[10px]">
                <div>Email: <span className="text-blue-600 font-bold">teamcash@afrobingo.et</span></div>
                <div>
                  Telegram:{' '}
                  <a
                    href="https://t.me/bole_afro_agent"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-bold underline"
                  >
                    https://t.me/bole_afro_agent
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section: RECOMMENDED */}
        <div>
          <div className="text-[11px] font-extrabold tracking-wider text-[#2e5b3c] uppercase mb-2">
            Recommended
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {recommendedBanks.map((b) => (
              <div
                key={b.id}
                onClick={() => handleOpenBankModal(b)}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition active:scale-95 flex flex-col justify-between relative group"
              >
                {b.badge && (
                  <span className="absolute top-1 right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                    {b.badge}
                  </span>
                )}

                {/* Logo Area */}
                <div className="h-16 flex items-center justify-center p-2 bg-gray-50/50">
                  {b.logoType === 'telebirr' && (
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-black text-[#008bd2]">telebirr</span>
                    </div>
                  )}
                  {b.logoType === 'cbe_birr' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-black text-[#821f57] tracking-tight">CBE Birr</span>
                    </div>
                  )}
                  {b.logoType === 'awash' && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black text-orange-600">AwashBank</span>
                    </div>
                  )}
                  {b.logoType === 'abyssinia' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-amber-700">Bank of Abyssinia</span>
                    </div>
                  )}
                  {b.logoType !== 'telebirr' &&
                    b.logoType !== 'cbe_birr' &&
                    b.logoType !== 'awash' &&
                    b.logoType !== 'abyssinia' && (
                      <span className="text-sm font-black text-gray-800">{b.name}</span>
                    )}
                </div>

                {/* Bottom title banner */}
                <div className="bg-[#4a5568] group-hover:bg-[#394251] text-white py-1.5 px-2 text-center text-xs font-bold transition">
                  {b.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: BANK TRANSFER */}
        {transferBanks.length > 0 && (
          <div className="mt-1">
            <div className="text-[11px] font-extrabold tracking-wider text-[#2e5b3c] uppercase mb-2">
              Bank Transfer
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {transferBanks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleOpenBankModal(b)}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition active:scale-95 flex flex-col justify-between group"
                >
                  <div className="h-16 flex items-center justify-center p-2 bg-gray-50/50">
                    <span className="text-sm font-black text-gray-800">{b.name}</span>
                  </div>
                  <div className="bg-[#4a5568] group-hover:bg-[#394251] text-white py-1.5 px-2 text-center text-xs font-bold transition">
                    {b.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL POPUP MATCHING SCREENSHOTS 2, 3, 4 ================= */}
      {selectedBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Top Bar */}
            <div className="p-3 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-gray-900">{selectedBank.name}</span>
              </div>
              <button
                onClick={() => setSelectedBank(null)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-4 overflow-y-auto flex flex-col gap-3 text-xs text-gray-800">
              {/* Provider Logo Header */}
              <div className="flex justify-center py-1">
                {selectedBank.logoType === 'telebirr' && (
                  <span className="text-3xl font-black text-[#008bd2]">telebirr</span>
                )}
                {selectedBank.logoType === 'cbe_birr' && (
                  <span className="text-2xl font-black text-[#821f57]">CBE Birr</span>
                )}
                {selectedBank.logoType === 'awash' && (
                  <span className="text-lg font-black text-orange-600">Awash Bank</span>
                )}
                {selectedBank.logoType === 'abyssinia' && (
                  <span className="text-sm font-black text-amber-700">Bank of Abyssinia</span>
                )}
                {selectedBank.logoType !== 'telebirr' &&
                  selectedBank.logoType !== 'cbe_birr' &&
                  selectedBank.logoType !== 'awash' &&
                  selectedBank.logoType !== 'abyssinia' && (
                    <span className="text-base font-black text-gray-900">{selectedBank.name}</span>
                  )}
              </div>

              {/* Green Warning Banner matching Screenshot 2 */}
              <div className="bg-[#2e7d32] text-white p-3 rounded-xl text-[11px] leading-relaxed font-semibold shadow-sm">
                Before creating a request, transfer funds within 10 minutes using the payment details provided below.
              </div>

              {/* Recipient Account Number with Copy */}
              <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold">
                    {selectedBank.name} ሂሳብ ቁጥር (Account):
                  </div>
                  <div className="text-sm font-black font-mono text-gray-900 mt-0.5">
                    {selectedBank.accountNumber}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(selectedBank.accountNumber, 'accNumber')}
                  className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition active:scale-95 flex items-center gap-1 font-bold text-[11px]"
                >
                  {copiedField === 'accNumber' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copiedField === 'accNumber' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Recipient Name with Copy */}
              <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold">የተቀባይ ስም (Recipient Name):</div>
                  <div className="text-xs font-black text-gray-900 mt-0.5">
                    {selectedBank.recipientName}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(selectedBank.recipientName, 'recName')}
                  className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition active:scale-95 flex items-center gap-1 font-bold text-[11px]"
                >
                  {copiedField === 'recName' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copiedField === 'recName' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Amount Field + Pills */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 mb-1">
                  <span>Amount (Min {selectedBank.minAmount}.00 ETB / Max {selectedBank.maxAmount.toLocaleString()}.00 ETB):</span>
                </div>
                <input
                  type="number"
                  min={selectedBank.minAmount}
                  max={selectedBank.maxAmount}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                  }}
                  className={`w-full px-3 py-2 border rounded-xl font-bold text-sm text-gray-900 focus:outline-none transition ${
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

                {/* Quick Selection Pills */}
                <div className="grid grid-cols-5 gap-1.5 mt-2">
                  {['300', '500', '1000', '3000', '5000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setAmount(amt);
                        if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                      }}
                      className={`py-1 text-center font-bold text-xs rounded-lg border transition ${
                        amount === amt
                          ? 'bg-green-700 text-white border-green-700 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {parseInt(amt).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Phone / Account Number */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 mb-1">
                  <label>የእርስዎ {selectedBank.name} ሂሳብ ቁጥር (Your Phone/Account):</label>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {playerPhone.length > 0 ? `${playerPhone.length} digits` : ''}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="09XXXXXXXX"
                  value={playerPhone}
                  onChange={(e) => {
                    setPlayerPhone(e.target.value);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className={`w-full px-3 py-2 border rounded-xl font-mono text-xs text-gray-900 focus:outline-none transition ${
                    errors.phone
                      ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400'
                      : 'border-gray-300 focus:border-green-600'
                  }`}
                />
                {errors.phone && (
                  <div className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.phone}</span>
                  </div>
                )}
              </div>

              {/* Receipt Reference Code */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  የትራንዛክሽን መለያ ኮድ (Transaction Ref Code from SMS):
                </label>
                <input
                  type="text"
                  placeholder="e.g. TB-89472190 or CBE-44102"
                  value={receiptRef}
                  onChange={(e) => {
                    setReceiptRef(e.target.value);
                    if (errors.receiptRef) setErrors((prev) => ({ ...prev, receiptRef: '' }));
                  }}
                  className={`w-full px-3 py-2 border rounded-xl font-mono text-xs text-gray-900 focus:outline-none uppercase transition ${
                    errors.receiptRef
                      ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400'
                      : 'border-gray-300 focus:border-green-600'
                  }`}
                />
                {errors.receiptRef && (
                  <div className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.receiptRef}</span>
                  </div>
                )}
              </div>

              {/* Red Warning Text matching Screenshot 2 */}
              <div className="text-[10px] text-[#d32f2f] leading-relaxed font-semibold">
                ተቀማጭ ገንዘቡ ከተጠቀሰው የመክፈያ ዘዴ ጋር ባልተያያዘ ሌሎች የክፍያ ዘዴዎች በኩል የተፈፀመ ከሆነ፤ ገንዘቡ ሊመለስ ይችላል። እባክዎ ምንም አይነት አስተያየት አይፃፉ
              </div>

              {feedback && (
                <div className="p-3 bg-green-100 border border-green-300 rounded-xl text-green-800 text-xs font-bold animate-fade-in flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{feedback.msg}</span>
                </div>
              )}
            </div>

            {/* Bottom CONFIRM button matching Screenshot 4 */}
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <button
                onClick={handleConfirm}
                disabled={submitting || isSuccess}
                className={`w-full py-3 text-white text-sm font-black rounded-xl shadow-lg transition active:scale-95 uppercase tracking-wider flex items-center justify-center gap-2 ${
                  isSuccess ? 'bg-[#10b981]' : 'bg-[#2e7d32] hover:bg-[#256628]'
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
        </div>
      )}
    </div>
  );
}
