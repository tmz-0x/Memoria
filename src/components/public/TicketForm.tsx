import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/mockApi';
import { PaymentDetails } from './PaymentDetails';
import {
  Upload,
  AlertCircle,
  Loader2,
  Ticket,
  FileCheck,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const TicketForm: React.FC = () => {
  const [ticketType, setTicketType] = useState<'student' | 'outsider'>('student');
  const [regNumber, setRegNumber] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    submissionId: string;
    message: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const maxBytes = 5 * 1024 * 1024; // 5MB limit (Section 16)

    if (file.size > maxBytes) {
      setFileError('File size exceeds 5MB. Please compress or attach a smaller image or PDF.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setFileError('Invalid file type. Only JPG, PNG, WEBP, or PDF files are accepted.');
      return;
    }

    setSlipFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setSlipPreview(url);
    } else {
      setSlipPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFileError(null);
    setRegError(null);

    if (ticketType === 'student') {
      const rawReg = regNumber.trim().toUpperCase();
      if (!rawReg) {
        setRegError('Please enter a valid university registration number.');
        return;
      }
      if (!/^[A-Z]{2,3}\d{5,7}$/.test(rawReg)) {
        setRegError('Please enter a valid university registration number (e.g. FC122716).');
        return;
      }
    }

    if (!slipFile) {
      setFileError('Please attach your genuine bank transfer receipt / payment slip.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitTicket({
        name,
        email,
        phone,
        quantity: ticketType === 'student' ? 1 : quantity,
        paymentSlip: slipFile,
        ticketType,
        universityRegistrationNumber: ticketType === 'student' ? regNumber.trim().toUpperCase() : null,
      });

      setSubmittedResult({
        submissionId: res.submissionId,
        message: res.message,
      });
    } catch (err: any) {
      const errMsg = err.message || 'Submission encountered an error. Please retry.';
      if (errMsg.toLowerCase().includes('registration number')) {
        setRegError(errMsg);
      }
      setFileError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRegNumber('');
    setRegError(null);
    setTicketType('student');
    setQuantity(1);
    setSlipFile(null);
    setSlipPreview(null);
    setFileError(null);
    setSubmittedResult(null);
  };

  return (
    <div className="pt-2">
      {/* Side-by-side Bank Credentials and Stable Form (Section 17, 21) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Bank Account Credentials */}
        <div className="lg:col-span-5 order-2 lg:order-1">
          <PaymentDetails />
        </div>

        {/* Right Column: CRITICAL - Stable Ticket Form with NO dramatic entrance animation (Section 21) */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <div className="rounded-2xl bg-[#1A0D2E] border border-[#D4AF37]/40 p-6 sm:p-8 shadow-2xl relative">
            {submittedResult ? (
              /* State 2 & 3: Submitted & Pending Verification Screen (Section 19) */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="py-8 text-center flex flex-col items-center justify-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                  <Clock className="w-8 h-8" />
                </div>

                <span className="font-heading text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-bold">
                  Payment Verification Pending
                </span>

                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-white">
                  Registration {submittedResult.submissionId}
                </h3>

                <p className="font-body text-xs sm:text-sm text-[#F0E6FA]/80 max-w-md leading-relaxed">
                  Your ticket request has been received and is waiting for manual verification by our committee desk.
                </p>

                <div className="p-4 rounded-xl bg-[#0D0518] border border-[#D4AF37]/30 text-left w-full max-w-md text-xs space-y-2 mt-4">
                  <div className="flex justify-between text-[#F0E6FA]/70">
                    <span>Category:</span>
                    <strong className="text-white capitalize">{ticketType === 'student' ? 'University Student' : 'Outsider'}</strong>
                  </div>
                  {ticketType === 'student' && regNumber && (
                    <div className="flex justify-between text-[#F0E6FA]/70">
                      <span>Registration No:</span>
                      <strong className="text-[#FF8FC7] font-mono">{regNumber}</strong>
                    </div>
                  )}
                  <div className="flex justify-between text-[#F0E6FA]/70">
                    <span>Registrant:</span>
                    <strong className="text-white">{name}</strong>
                  </div>
                  <div className="flex justify-between text-[#F0E6FA]/70">
                    <span>Contact Email:</span>
                    <strong className="text-white">{email}</strong>
                  </div>
                  <div className="flex justify-between text-[#F0E6FA]/70">
                    <span>Total Reserved:</span>
                    <strong className="text-[#D4AF37] font-heading">
                      {ticketType === 'student' ? '1 Pass • Rs. 200' : `${quantity} Pass${quantity > 1 ? 'es' : ''} • Rs. ${(quantity * 1000).toLocaleString()}`}
                    </strong>
                  </div>
                  <div className="pt-2 border-t border-[#D4AF37]/20 flex items-center gap-1.5 text-[11px] text-amber-300">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Once verified, your QR gate pass will be delivered to your inbox.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="mt-6 px-6 py-2.5 rounded-full font-heading text-xs tracking-wider uppercase font-bold text-[#0D0518] bg-[#D4AF37] hover:bg-[#FFB3D9] transition-colors cursor-pointer"
                >
                  Submit Another Reservation
                </button>
              </motion.div>
            ) : (
              /* State 1: Form (Unanimated, stable, trustworthy) */
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="pb-4 border-b border-[#D4AF37]/20 flex items-center justify-between">
                  <div>
                    <h3 className="font-heading text-xl font-bold text-white">
                      Attendee Registration
                    </h3>
                    <p className="font-body text-xs text-[#F0E6FA]/60 mt-0.5">
                      All submissions are verified manually against bank statements before ticket issuance.
                    </p>
                  </div>
                  <Ticket className="w-6 h-6 text-[#D4AF37]" />
                </div>

                {/* Ticket Category Selector */}
                <div>
                  <label className="block text-xs font-heading uppercase tracking-wider text-[#F0E6FA]/80 mb-2">
                    Select Ticket Category *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option 1: University Student */}
                    <button
                      type="button"
                      onClick={() => {
                        setTicketType('student');
                        setQuantity(1);
                        setFileError(null);
                        setRegError(null);
                      }}
                      className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${
                        ticketType === 'student'
                          ? 'bg-[#1A0D2E] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)] ring-1 ring-[#D4AF37]'
                          : 'bg-[#0D0518]/70 border-[#D4AF37]/25 hover:border-[#D4AF37]/50 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="inline-flex items-center gap-1 text-[10px] font-heading font-bold uppercase tracking-wider text-[#FF8FC7] bg-[#FF8FC7]/10 px-2 py-0.5 rounded border border-[#FF8FC7]/30">
                          University Student
                        </span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${ticketType === 'student' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#F0E6FA]/40'}`}>
                          {ticketType === 'student' && <div className="w-1.5 h-1.5 rounded-full bg-[#0D0518]" />}
                        </div>
                      </div>
                      <div className="mt-2.5">
                        <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                          University Student
                        </h4>
                        <div className="text-2xl font-heading font-black text-[#D4AF37] mt-0.5">
                          Rs. 200
                        </div>
                        <p className="text-[11px] text-[#F0E6FA]/70 mt-1 leading-normal">
                          Valid university registration number required. Strictly 1 pass per student ID.
                        </p>
                      </div>
                    </button>

                    {/* Option 2: Outsider */}
                    <button
                      type="button"
                      onClick={() => {
                        setTicketType('outsider');
                        setFileError(null);
                        setRegError(null);
                      }}
                      className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${
                        ticketType === 'outsider'
                          ? 'bg-[#1A0D2E] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)] ring-1 ring-[#D4AF37]'
                          : 'bg-[#0D0518]/70 border-[#D4AF37]/25 hover:border-[#D4AF37]/50 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="inline-flex items-center gap-1 text-[10px] font-heading font-bold uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                          General Public
                        </span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${ticketType === 'outsider' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#F0E6FA]/40'}`}>
                          {ticketType === 'outsider' && <div className="w-1.5 h-1.5 rounded-full bg-[#0D0518]" />}
                        </div>
                      </div>
                      <div className="mt-2.5">
                        <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                          Outsider
                        </h4>
                        <div className="text-2xl font-heading font-black text-white mt-0.5">
                          Rs. 1,000
                        </div>
                        <p className="text-[11px] text-[#F0E6FA]/70 mt-1 leading-normal">
                          Open to external attendees, alumni, and music lovers. Up to 5 passes.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* University Registration Number */}
                {ticketType === 'student' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-heading uppercase tracking-wider text-[#F0E6FA]/80">
                        University Registration Number *
                      </label>
                      <span className="text-[10px] font-heading uppercase tracking-wider text-[#FF8FC7]">
                        Example: FCxxxxxx
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      value={regNumber}
                      onChange={(e) => {
                        setRegNumber(e.target.value.toUpperCase());
                        setRegError(null);
                        setFileError(null);
                      }}
                      placeholder="FCxxxxxx"
                      className="w-full px-4 py-3 rounded-xl bg-[#0D0518] border border-[#D4AF37]/40 text-white placeholder-[#F0E6FA]/30 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-all text-sm font-mono uppercase tracking-wider"
                    />
                    <p className="text-[11px] text-[#F0E6FA]/60 mt-1 font-light">
                      Enter your unique university registration number.
                    </p>
                    {regError && (
                      <div className="flex items-center gap-1.5 text-rose-400 text-xs mt-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{regError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-heading uppercase tracking-wider text-[#F0E6FA]/80 mb-1.5">
                    Full Name (As appearing on Bank Transfer) *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kavinda Perera"
                    className="w-full px-4 py-3 rounded-xl bg-[#0D0518] border border-[#D4AF37]/30 text-white placeholder-[#F0E6FA]/30 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-all text-sm"
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-heading uppercase tracking-wider text-[#F0E6FA]/80 mb-1.5">
                      Email Address (For QR E-Ticket) *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="kavinda@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-[#0D0518] border border-[#D4AF37]/30 text-white placeholder-[#F0E6FA]/30 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-heading uppercase tracking-wider text-[#F0E6FA]/80 mb-1.5">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+94 77 123 4567"
                      className="w-full px-4 py-3 rounded-xl bg-[#0D0518] border border-[#D4AF37]/30 text-white placeholder-[#F0E6FA]/30 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Quantity and Price Calculation */}
                {ticketType === 'outsider' ? (
                  <div className="p-4 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="w-full sm:w-auto">
                      <label className="block text-xs font-heading uppercase tracking-wider text-[#F0E6FA]/80 mb-1">
                        Quantity of Passes (Rs. 1,000 each)
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        {[1, 2, 3, 4, 5].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setQuantity(q)}
                            className={`w-9 h-9 rounded-lg font-heading text-xs font-bold transition-all cursor-pointer ${
                              quantity === q
                                ? 'bg-gradient-to-r from-[#D4AF37] to-[#FF8FC7] text-[#0D0518] shadow-[0_0_10px_rgba(212,175,55,0.6)]'
                                : 'bg-[#1A0D2E] border border-[#D4AF37]/30 text-[#F0E6FA] hover:border-[#D4AF37]'
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-[#D4AF37]/20">
                      <span className="block text-[10px] uppercase font-heading text-[#F0E6FA]/60">
                        Total Transfer Amount
                      </span>
                      <span className="text-xl sm:text-2xl font-heading font-extrabold text-[#D4AF37]">
                        Rs. {(quantity * 1000).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20 flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-heading uppercase tracking-wider text-[#F0E6FA]/80">
                        Student Ticket Allocation
                      </span>
                      <span className="text-[11px] text-[#FF8FC7]">
                        Strict rule: 1 Pass per registration number
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase font-heading text-[#F0E6FA]/60">
                        Total Transfer Amount
                      </span>
                      <span className="text-xl sm:text-2xl font-heading font-extrabold text-[#D4AF37]">
                        Rs. 200
                      </span>
                    </div>
                  </div>
                )}

                {/* Payment Slip Upload (Section 16: JPG, PNG, PDF <= 5MB) */}
                <div>
                  <label className="block text-xs font-heading uppercase tracking-wider text-[#F0E6FA]/80 mb-1.5">
                    Upload Bank Transfer Proof / Slip * (JPG, PNG, PDF ≤ 5MB)
                  </label>

                  <div className="relative border-2 border-dashed border-[#D4AF37]/40 hover:border-[#D4AF37] rounded-xl p-5 text-center bg-[#0D0518]/50 transition-colors cursor-pointer group">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />

                    {slipFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileCheck className="w-6 h-6 text-emerald-400" />
                        <div className="text-left">
                          <span className="block font-heading text-xs text-white font-semibold truncate max-w-xs">
                            {slipFile.name}
                          </span>
                          <span className="text-[10px] text-emerald-400">
                            {(slipFile.size / 1024).toFixed(1)} KB &bull; Verified format
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="p-3 rounded-full bg-[#1A0D2E] text-[#D4AF37] group-hover:scale-110 transition-transform">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-heading text-[#F0E6FA] font-medium">
                          Click or drag transfer receipt here
                        </span>
                        <span className="text-[10px] text-[#F0E6FA]/40 font-body">
                          Supported: JPG, PNG, WEBP, PDF (Max 5MB)
                        </span>
                      </div>
                    )}
                  </div>

                  {slipPreview && (
                    <div className="mt-3 flex items-center gap-3 p-2 rounded-lg bg-[#0D0518] border border-[#D4AF37]/20">
                      <img
                        src={slipPreview}
                        alt="Slip Preview"
                        className="w-16 h-12 object-cover rounded border border-[#D4AF37]/40"
                      />
                      <span className="text-[11px] text-[#F0E6FA]/70">Transfer proof attached</span>
                    </div>
                  )}

                  {fileError && (
                    <div className="flex items-center gap-2 text-rose-400 text-xs mt-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-xl font-heading text-sm tracking-[0.2em] font-bold uppercase text-[#0D0518] bg-gradient-to-r from-[#D4AF37] via-[#FF8FC7] to-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.5)] hover:shadow-[0_0_35px_rgba(224,102,255,0.8)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0D0518]" />
                      <span>Submitting To Review Desk...</span>
                    </>
                  ) : (
                    <span>
                      Submit Reservation — Rs. {ticketType === 'student' ? '200' : (quantity * 1000).toLocaleString()}
                    </span>
                  )}
                </button>

                <p className="text-[11px] text-[#F0E6FA]/50 text-center leading-relaxed">
                  By submitting, you certify that the payment transferred is genuine. Your admission barcode will be registered under your name.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
