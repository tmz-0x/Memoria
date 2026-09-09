import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Landmark,
  UploadCloud,
  Clock,
  CheckCircle,
  Mail,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface HowToBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToBuyModal: React.FC<HowToBuyModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0D0518]/85 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-2xl bg-[#1A0D2E] border border-[#D4AF37]/50 rounded-2xl shadow-[0_0_50px_rgba(212,175,55,0.3)] overflow-hidden z-10 my-8"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[#D4AF37]/20 flex items-center justify-between bg-gradient-to-r from-[#1A0D2E] to-[#0D0518]">
              <div>
                <span className="font-heading text-[10px] tracking-[0.25em] text-[#D4AF37] uppercase font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Official Ticketing Guide
                </span>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-white mt-0.5">
                  How To Reserve & Admission Rules
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#F0E6FA]/60 hover:text-white hover:bg-[#D4AF37]/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs sm:text-sm font-body text-[#F0E6FA]/80">
              {/* 6 Step Purchase Flow */}
              <div>
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-[#FF8FC7] mb-3">
                  Step-by-Step Purchasing Process
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
                    <strong className="text-[#D4AF37] block font-heading text-[11px] mb-1">01. Fill Details & Category</strong>
                    <span>Select University Student (with valid Reg No, 1 ticket) or Outsider (1–5 passes), then enter your contact details.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
                    <strong className="text-[#D4AF37] block font-heading text-[11px] mb-1">02. Transfer Funds</strong>
                    <span>Transfer the exact amount (Student: Rs. 200 | Outsider: Rs. 1,000 × quantity) to the official Bank of Ceylon account.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
                    <strong className="text-[#D4AF37] block font-heading text-[11px] mb-1">03. Reference Remarks</strong>
                    <span>Use your Full Name as the transaction remark for instant reconciliation.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
                    <strong className="text-[#D4AF37] block font-heading text-[11px] mb-1">04. Upload Slip</strong>
                    <span>Attach your genuine digital transfer receipt or deposit slip (JPG/PNG/PDF ≤ 5MB).</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
                    <strong className="text-[#D4AF37] block font-heading text-[11px] mb-1">05. Committee Review</strong>
                    <span>Our finance desk verifies your transfer against our banking statement within 24–48h.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
                    <strong className="text-[#D4AF37] block font-heading text-[11px] mb-1">06. E-Ticket Dispatched</strong>
                    <span>Your unique encrypted QR gate pass is delivered directly to your email inbox.</span>
                  </div>
                </div>
              </div>

              {/* Event Rules & Regulations */}
              <div className="pt-4 border-t border-[#D4AF37]/20 space-y-3">
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#D4AF37]" />
                  Terms of Admission & Policy
                </h4>
                <ul className="space-y-2 text-xs leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4AF37] font-bold">&bull;</span>
                    <span><strong>Manual Verification:</strong> All ticket applications are manually reconciled before approval. Tickets are not guaranteed until payment is verified.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4AF37] font-bold">&bull;</span>
                    <span><strong>Unique QR Admission:</strong> Each approved pass contains a cryptographically signed QR code. Each code can be scanned exactly once at the gate. Duplication or sharing is strictly prohibited.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4AF37] font-bold">&bull;</span>
                    <span><strong>Ticket Categories:</strong> University Student tickets (Rs. 200) strictly require a valid university registration number (limit 1 ticket per student ID). Outsider tickets (Rs. 1,000) are open to alumni, external guests, and the general public.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4AF37] font-bold">&bull;</span>
                    <span><strong>Non-Refundable Policy:</strong> Approved tickets are non-refundable once allocated. In case of slip rejection, you may re-submit with corrected banking evidence.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4AF37] font-bold">&bull;</span>
                    <span><strong>Gate Timing:</strong> Doors open at 5:30 PM. Showtime commences promptly at 6:30 PM. Late arrivals will be seated between performance acts.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#D4AF37]/20 bg-[#0D0518]/90 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-full font-heading text-xs uppercase tracking-wider font-bold text-[#0D0518] bg-gradient-to-r from-[#D4AF37] to-[#FF8FC7] hover:shadow-[0_0_15px_#D4AF37] transition-all cursor-pointer"
              >
                Understood & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
