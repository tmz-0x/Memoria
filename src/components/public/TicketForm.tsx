import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/mockApi';
import { PaymentDetails } from './PaymentDetails';
import { SectionDivider } from './SectionDivider';
import { Sparkles, Upload, CheckCircle, AlertCircle, Loader2, Ticket, FileCheck } from 'lucide-react';

export const TicketForm: React.FC = () => {
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
    const maxBytes = 5 * 1024 * 1024; // 5MB

    if (file.size > maxBytes) {
      setFileError('File size exceeds the 5MB limit. Please upload a smaller image or PDF.');
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
    if (!slipFile) {
      setFileError('Please attach your bank transfer receipt / payment slip.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitTicket({
        name,
        email,
        phone,
        quantity,
        paymentSlip: slipFile,
      });

      setSubmittedResult({
        submissionId: res.submissionId,
        message: res.message,
      });
    } catch {
      setFileError('Submission encountered an error. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setQuantity(1);
    setSlipFile(null);
    setSlipPreview(null);
    setFileError(null);
    setSubmittedResult(null);
  };

  return (
    <section id="ticket-form" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0D0518] via-[#1A0D2E] to-[#0D0518]">
      <div className="max-w-6xl mx-auto">
        <SectionDivider />

        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="font-heading text-xs tracking-[0.35em] text-[#D4AF37] uppercase font-bold inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            ACT V — REGISTRATION
            <Sparkles className="w-3.5 h-3.5" />
          </span>

          <h2 className="font-heading text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F0E6FA] via-[#FF8FC7] to-[#D4AF37] mt-3">
            Reserve Your Pass
          </h2>

          <p className="font-body text-base text-[#F0E6FA]/70 mt-3 font-light">
            Complete the official form and attach your payment confirmation below.
          </p>
        </div>

        {/* Master Layout: Side-by-side Payment Details and Stable Ticket Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Payment Account Credentials */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <PaymentDetails />
          </div>

          {/* CRITICAL: Stable Ticket Form with NO entrance animation wrapper */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <div className="rounded-2xl bg-[#1A0D2E] border border-[#D4AF37]/40 p-6 sm:p-8 shadow-2xl relative">
              {submittedResult ? (
                /* Only the success state fades in gently */
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="py-8 text-center flex flex-col items-center justify-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                    <CheckCircle className="w-8 h-8" />
                  </div>

                  <span className="font-heading text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-bold">
                    Registration Received
                  </span>

                  <h3 className="font-heading text-2xl sm:text-3xl font-bold text-white">
                    Submission {submittedResult.submissionId}
                  </h3>

                  <p className="font-body text-sm text-[#F0E6FA]/80 max-w-md leading-relaxed">
                    {submittedResult.message}
                  </p>

                  <div className="p-4 rounded-xl bg-[#0D0518] border border-[#D4AF37]/30 text-left w-full max-w-md text-xs space-y-2 mt-4">
                    <div className="flex justify-between text-[#F0E6FA]/70">
                      <span>Registrant:</span>
                      <strong className="text-white">{name}</strong>
                    </div>
                    <div className="flex justify-between text-[#F0E6FA]/70">
                      <span>Confirmation Email:</span>
                      <strong className="text-white">{email}</strong>
                    </div>
                    <div className="flex justify-between text-[#F0E6FA]/70">
                      <span>Total Reserved:</span>
                      <strong className="text-[#D4AF37] font-heading">{quantity} Ticket(s) &bull; Rs. {(quantity * 1000).toLocaleString()}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="mt-6 px-6 py-2.5 rounded-full font-heading text-xs tracking-wider uppercase font-bold text-[#0D0518] bg-[#D4AF37] hover:bg-[#FFB3D9] transition-colors"
                  >
                    Submit Another Registration
                  </button>
                </motion.div>
              ) : (
                /* Unanimated, stable, trustworthy form */
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="pb-4 border-b border-[#D4AF37]/20 flex items-center justify-between">
                    <div>
                      <h3 className="font-heading text-xl font-bold text-white">
                        Guest Details
                      </h3>
                      <p className="font-body text-xs text-[#F0E6FA]/60 mt-0.5">
                        All fields are verified manually before QR generation.
                      </p>
                    </div>
                    <Ticket className="w-6 h-6 text-[#D4AF37]" />
                  </div>

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
                        Email Address (For E-Ticket) *
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
                        Phone / WhatsApp *
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
                  <div className="p-4 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="w-full sm:w-auto">
                      <label className="block text-xs font-heading uppercase tracking-wider text-[#F0E6FA]/80 mb-1">
                        Quantity of Tickets
                      </label>
                      <div className="flex items-center gap-3 mt-1">
                        {[1, 2, 3, 4, 5].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setQuantity(q)}
                            className={`w-9 h-9 rounded-lg font-heading text-xs font-bold transition-all ${
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
                        Total Amount Due
                      </span>
                      <span className="text-xl sm:text-2xl font-heading font-extrabold text-[#D4AF37]">
                        Rs. {(quantity * 1000).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Payment Slip Upload */}
                  <div>
                    <label className="block text-xs font-heading uppercase tracking-wider text-[#F0E6FA]/80 mb-1.5">
                      Upload Bank Transfer Receipt / Slip * (JPG, PNG, PDF ≤ 5MB)
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
                              {(slipFile.size / 1024).toFixed(1)} KB &bull; Ready to submit
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2">
                          <div className="p-3 rounded-full bg-[#1A0D2E] text-[#D4AF37] group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-heading text-[#F0E6FA] font-medium">
                            Drag & drop or click to browse files
                          </span>
                          <span className="text-[10px] text-[#F0E6FA]/40 font-body">
                            Supported: JPG, PNG, WEBP, PDF (Max 5MB)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Image Preview thumbnail if image */}
                    {slipPreview && (
                      <div className="mt-3 flex items-center gap-3 p-2 rounded-lg bg-[#0D0518] border border-[#D4AF37]/20">
                        <img
                          src={slipPreview}
                          alt="Slip Preview"
                          className="w-16 h-12 object-cover rounded border border-[#D4AF37]/40"
                        />
                        <span className="text-[11px] text-[#F0E6FA]/70">Slip preview attached</span>
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
                        <span>Verifying & Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#0D0518]" />
                        <span>Submit Registration — Rs. {(quantity * 1000).toLocaleString()}</span>
                      </>
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
    </section>
  );
};
