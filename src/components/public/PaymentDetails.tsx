import React, { useState } from 'react';
import { Copy, Check, Landmark, AlertTriangle, ShieldCheck, CreditCard } from 'lucide-react';

export interface PaymentAccountInfo {
  accountLabel: string;
  badge?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  isPlaceholder?: boolean;
}

export interface PaymentDetailsProps {
  account1?: Partial<PaymentAccountInfo>;
  account2?: Partial<PaymentAccountInfo>;
  // Backward compatibility with previous single-account props
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branch?: string;
}

export const PaymentDetails: React.FC<PaymentDetailsProps> = ({
  account1,
  account2,
  bankName,
  accountName,
  accountNumber,
  branch,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    // Don't copy placeholder text
    if (text.includes('[ADD REQUIRED')) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 1500);
  };

  const acc1: PaymentAccountInfo = {
    accountLabel: account1?.accountLabel || 'Payment Account 01',
    badge: account1?.badge || 'Primary Gateway',
    bankName: bankName || account1?.bankName || 'Peoples bank',
    accountName: accountName || account1?.accountName || 'N.T.P gallage',
    accountNumber: accountNumber || account1?.accountNumber || '188200230053755',
    branch: branch || account1?.branch || 'Ahangama Branch',
    isPlaceholder: account1?.isPlaceholder || false,
  };

  const acc2: PaymentAccountInfo = {
    accountLabel: account2?.accountLabel || 'Payment Account 02',
    badge: account2?.badge || 'Secondary Gateway',
    bankName: account2?.bankName || '[ADD REQUIRED BANK NAME]',
    accountName: account2?.accountName || '[ADD REQUIRED ACCOUNT NAME]',
    accountNumber: account2?.accountNumber || '[ADD REQUIRED ACCOUNT NUMBER]',
    branch: account2?.branch || '[ADD REQUIRED BRANCH]',
    isPlaceholder: account2?.isPlaceholder ?? true,
  };

  const accounts = [acc1, acc2];

  return (
    <div className="rounded-2xl bg-[#1A0D2E] border border-[#D4AF37]/40 p-5 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#C04ECF]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#D4AF37]/20 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-heading text-sm sm:text-base font-bold uppercase tracking-wider text-white">
              Official Bank Credentials
            </h4>
            <span className="text-[11px] text-[#FF8FC7] font-body">
              Direct Deposit or Online Bank Transfer &bull; Select either verified account
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-heading text-[#D4AF37] self-start sm:self-auto px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/25">
          <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
          <span>Verified Accounts</span>
        </div>
      </div>

      {/* Fix 11: Two Separate Payment Accounts (Desktop: 2-Column Grid | Mobile: Stacked) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {accounts.map((acc, index) => {
          const accId = `acc${index + 1}`;
          const isSecondPlaceholder = acc.isPlaceholder;

          return (
            <div
              key={accId}
              className="p-5 sm:p-6 rounded-2xl bg-[#0D0518]/90 border border-[#D4AF37]/35 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-[#D4AF37]/70 transition-all duration-300"
            >
              {/* Corner ambient glow */}
              <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-[#E066FF]/10 rounded-full blur-2xl pointer-events-none" />

              <div>
                {/* Account Numbered Header */}
                <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#D4AF37]/15">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[10px] font-heading font-extrabold uppercase tracking-widest text-[#D4AF37]">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{acc.accountLabel}</span>
                  </div>
                  {acc.badge && (
                    <span className="text-[10px] font-heading font-medium tracking-wider text-[#FFB3D9] uppercase">
                      {acc.badge}
                    </span>
                  )}
                </div>

                {/* Bank & Branch Sub-Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-[#1A0D2E]/70 border border-[#D4AF37]/20">
                    <span className="block text-[10px] font-heading uppercase tracking-wider text-[#F0E6FA]/50 mb-0.5">
                      Bank
                    </span>
                    <span className="font-heading text-xs sm:text-sm font-semibold text-[#F0E6FA] break-words">
                      {acc.bankName}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1A0D2E]/70 border border-[#D4AF37]/20">
                    <span className="block text-[10px] font-heading uppercase tracking-wider text-[#F0E6FA]/50 mb-0.5">
                      Branch
                    </span>
                    <span className="font-heading text-xs sm:text-sm font-semibold text-[#F0E6FA] break-words">
                      {acc.branch}
                    </span>
                  </div>
                </div>

                {/* Account Holder / Name */}
                <div className="p-3.5 rounded-xl bg-[#1A0D2E]/70 border border-[#D4AF37]/20 flex items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-heading uppercase tracking-wider text-[#F0E6FA]/50 mb-0.5">
                      Account Holder / Name
                    </span>
                    <span className="font-heading text-xs sm:text-sm font-semibold text-[#F0E6FA] break-words">
                      {acc.accountName}
                    </span>
                  </div>
                  {!isSecondPlaceholder && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(acc.accountName, `${accId}-accountName`)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] text-xs font-heading flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      {copiedField === `${accId}-accountName` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold text-[11px]">Copied ✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Account Number with Prominent Copy Button */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-[#080210] border border-[#D4AF37]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner mt-1">
                <div className="min-w-0">
                  <span className="block text-[10px] font-heading uppercase tracking-wider text-[#D4AF37] mb-0.5">
                    Account Number {isSecondPlaceholder ? '' : '(Click to copy)'}
                  </span>
                  <span className="font-mono text-sm sm:text-base lg:text-lg font-bold text-white tracking-wider break-all">
                    {acc.accountNumber}
                  </span>
                </div>
                {!isSecondPlaceholder && (
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(acc.accountNumber.replace(/[^0-9]/g, ''), `${accId}-accountNumber`)
                    }
                    className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#FFB3D9] text-[#0D0518] text-xs font-heading font-bold flex items-center justify-center gap-1.5 hover:shadow-[0_0_15px_rgba(212,175,55,0.6)] transition-all cursor-pointer shrink-0 active:scale-95"
                  >
                    {copiedField === `${accId}-accountNumber` ? (
                      <>
                        <Check className="w-4 h-4 text-[#0D0518]" />
                        <span>Copied ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#0D0518]" />
                        <span>Copy Number</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mandatory Reference Notice */}
      <div className="mt-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="font-body text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300">Important:</strong> Use your <strong>full name</strong> as the payment transfer reference/remarks so we can immediately match your transfer to your registration form.
        </p>
      </div>
    </div>
  );
};
