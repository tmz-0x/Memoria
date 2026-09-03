import React, { useState } from 'react';
import { Copy, Check, Landmark, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PaymentDetailsProps {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branch?: string;
}

export const PaymentDetails: React.FC<PaymentDetailsProps> = ({
  bankName = 'Bank of Ceylon',
  accountName = 'JPURA Voiceclub Memoria Account',
  accountNumber = '8942-0012-3841-992',
  branch = 'Colombo Fort Branch',
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 1500);
  };

  return (
    <div className="rounded-2xl bg-[#1A0D2E] border border-[#D4AF37]/40 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#C04ECF]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/20 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37]">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-white">
              Official Bank Credentials
            </h4>
            <span className="text-[11px] text-[#FF8FC7] font-body">Direct Deposit or Online Transfer</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-heading text-[#D4AF37]">
          <ShieldCheck className="w-4 h-4" />
          <span>Verified Account</span>
        </div>
      </div>

      {/* Account Info Cards */}
      <div className="space-y-4">
        {/* Bank & Branch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
            <span className="block text-[10px] font-heading uppercase tracking-wider text-[#F0E6FA]/50 mb-1">
              Bank
            </span>
            <span className="font-heading text-sm font-semibold text-[#F0E6FA]">
              {bankName}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
            <span className="block text-[10px] font-heading uppercase tracking-wider text-[#F0E6FA]/50 mb-1">
              Branch
            </span>
            <span className="font-heading text-sm font-semibold text-[#F0E6FA]">
              {branch}
            </span>
          </div>
        </div>

        {/* Account Name */}
        <div className="p-3.5 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-heading uppercase tracking-wider text-[#F0E6FA]/50 mb-1">
              Account Name
            </span>
            <span className="font-heading text-xs sm:text-sm font-semibold text-[#F0E6FA]">
              {accountName}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(accountName, 'accountName')}
            className="px-2.5 py-1.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] text-xs font-heading flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedField === 'accountName' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Account Number with Prominent Copy Button */}
        <div className="p-4 rounded-xl bg-[#0D0518] border border-[#D4AF37]/50 flex items-center justify-between shadow-inner">
          <div>
            <span className="block text-[10px] font-heading uppercase tracking-wider text-[#D4AF37] mb-1">
              Account Number (Click to copy)
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-white tracking-wider">
              {accountNumber}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(accountNumber.replace(/[^0-9]/g, ''), 'accountNumber')}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#FFB3D9] text-[#0D0518] text-xs font-heading font-bold flex items-center gap-1.5 hover:shadow-[0_0_15px_rgba(212,175,55,0.6)] transition-all cursor-pointer"
          >
            {copiedField === 'accountNumber' ? (
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
        </div>
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
