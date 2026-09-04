import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/mockApi';
import { useEventStore } from '../store/eventStore';
import { PaymentDetails } from '../components/public/PaymentDetails';
import { ParticleField } from '../components/public/ParticleField';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Ticket,
  Clock,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  Loader2,
  ShieldCheck,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export const TicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, fetchSettings } = useEventStore();

  useEffect(() => {
    fetchSettings();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [fetchSettings]);

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

  const remaining = settings?.remainingAllocation ?? 142;
  const capacity = settings?.totalCapacity ?? 800;
  const price = settings?.ticketPrice ?? 1000;
  const cutoffDate = settings?.cutoffDate ?? 'November 10, 2026';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const maxBytes = 5 * 1024 * 1024; // 5MB limit

    if (file.size > maxBytes) {
      setFileError('File size exceeds 5MB. Please attach a smaller image or PDF.');
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
      setFileError('Please attach your genuine bank transfer receipt / payment slip.');
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
    <div className="min-h-screen bg-[#0D0518] text-[#F0E6FA] relative overflow-x-hidden pb-24">
      {/* Background Theatrical Stardust Particles (Section 10: Behind UI) */}
      <ParticleField enabled={true} />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0D0518]/92 backdrop-blur-md border-b border-[#D4AF37]/20 py-4 px-4 sm:px-8 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs sm:text-sm font-heading uppercase tracking-widest text-[#D4AF37] hover:text-[#FF8FC7] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Event</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-wordmark text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5F8] via-[#FF8FC7] to-[#D4AF37]">
              Memoria&apos;26
            </span>
          </div>
        </div>
      </header>

      {/* Main Ticketing Content (z-25: In front of particles, ensuring 100% crisp readability) */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 relative z-25">
        {/* Page Title & Intro */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="font-heading text-xs tracking-[0.35em] text-[#D4AF37] uppercase font-bold inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            OFFICIAL ADMISSION COUNTER
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-white mt-2">
            Ticket Reservation
          </h1>
          <p className="font-body text-xs sm:text-sm text-[#F0E6FA]/70 mt-3 font-light">
            Secure your presence for Memoria&apos;26. All online reservations are manually verified by our finance desk before QR pass delivery.
          </p>
        </div>

        {/* Master Theatrical Ticket Frame (screen4.png & screen11.png) */}
        <div className="relative rounded-3xl overflow-hidden bg-[#1A0D2E] border-2 border-[#D4AF37]/50 p-6 sm:p-10 shadow-[0_0_50px_rgba(212,175,55,0.25)] mb-10">
          {/* Authentic Ornate Gold Filigree Ticket Frame */}
          <img
            src="/assets/ticket-frame.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none mix-blend-screen"
          />

          {/* Authentic Brass Memoria Wax Seal Emblem */}
          <div className="absolute -top-4 -right-4 sm:top-6 sm:right-6 w-20 h-20 sm:w-28 sm:h-28 opacity-85 pointer-events-none filter drop-shadow-[0_0_20px_rgba(212,175,55,0.7)] z-20">
            <img
              src="/assets/memoria-seal.png"
              alt="Memoria Seal"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#D4AF37]/30 sm:pr-24">
              <div>
                <span className="text-[11px] font-heading font-bold uppercase tracking-[0.3em] text-[#FF8FC7] block">
                  Official Admission Pass &bull; General Admission
                </span>
                <h2 className="font-wordmark text-4xl sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5F8] via-[#FF8FC7] to-[#D4AF37] mt-1 select-none">
                  Memoria&apos;26
                </h2>
                <span className="font-heading text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-semibold block mt-0.5">
                  The Eclipse Of Memories
                </span>
              </div>

              <div className="sm:text-right bg-[#0D0518]/80 px-6 py-4 rounded-2xl border border-[#D4AF37]/40 shadow-inner">
                <span className="text-[10px] font-heading uppercase tracking-widest text-[#F0E6FA]/60 block">
                  Admission Price
                </span>
                <div className="text-3xl sm:text-4xl font-heading font-black text-[#D4AF37]">
                  Rs. {price.toLocaleString()}
                </div>
                <span className="text-[11px] text-[#FFB3D9] font-body">Per Attendee / Single Entry</span>
              </div>
            </div>

            {/* Essential Event Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
              <div className="p-4 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/25 flex items-center gap-3.5">
                <Calendar className="w-6 h-6 text-[#D4AF37] shrink-0" />
                <div>
                  <span className="block text-[10px] uppercase font-heading tracking-wider text-[#F0E6FA]/50">Date & Time</span>
                  <span className="text-xs sm:text-sm font-heading font-bold text-white">Sat, Nov 14, 2026</span>
                  <span className="block text-[10px] text-[#FF8FC7]">Gates: 5:30 PM &bull; Show: 6:30 PM</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/25 flex items-center gap-3.5">
                <MapPin className="w-6 h-6 text-[#FF8FC7] shrink-0" />
                <div>
                  <span className="block text-[10px] uppercase font-heading tracking-wider text-[#F0E6FA]/50">Venue</span>
                  <span className="text-xs sm:text-sm font-heading font-bold text-white">Nelum Pokuna Theatre</span>
                  <span className="block text-[10px] text-[#F0E6FA]/60">Mahinda Rajapaksa Auditorium</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/25 flex items-center gap-3.5">
                <Ticket className="w-6 h-6 text-[#E066FF] shrink-0" />
                <div>
                  <span className="block text-[10px] uppercase font-heading tracking-wider text-[#F0E6FA]/50">Online Allocation</span>
                  <span className="text-xs sm:text-sm font-heading font-bold text-[#D4AF37]">{remaining} Passes Left</span>
                  <span className="block text-[10px] text-[#F0E6FA]/60">Cutoff: {cutoffDate}</span>
                </div>
              </div>
            </div>

            {/* Allocation Meter */}
            <div>
              <div className="flex items-center justify-between text-xs font-heading mb-1.5">
                <span className="text-[#F0E6FA]/80 uppercase tracking-wider">Allocation Status</span>
                <span className="text-[#D4AF37] font-bold">
                  {capacity - remaining} / {capacity} Passes Allocated
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#0D0518] rounded-full overflow-hidden border border-[#D4AF37]/30">
                <div
                  className="h-full bg-gradient-to-r from-[#D4AF37] via-[#FF8FC7] to-[#E066FF] rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(10, ((capacity - remaining) / capacity) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 7-Step How to Buy Guide */}
        <div className="p-6 rounded-2xl bg-[#1A0D2E]/60 border border-[#D4AF37]/30 shadow-lg mb-10">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#D4AF37]/20">
            <HelpCircle className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-heading text-sm sm:text-base font-bold uppercase tracking-wider text-white">
              How To Reserve Your Pass
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
              <span className="font-heading text-[#D4AF37] font-bold block mb-1">01 &bull; Fill Details</span>
              <p className="text-[#F0E6FA]/70">Enter your full name, active email address, and phone number.</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
              <span className="font-heading text-[#D4AF37] font-bold block mb-1">02 &bull; Select Quantity</span>
              <p className="text-[#F0E6FA]/70">Choose pass count (1–5 passes). Price is Rs. 1000 per pass.</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
              <span className="font-heading text-[#D4AF37] font-bold block mb-1">03 &bull; Bank Transfer</span>
              <p className="text-[#F0E6FA]/70">Transfer total amount to Bank of Ceylon with your full name as remarks.</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
              <span className="font-heading text-[#D4AF37] font-bold block mb-1">04 &bull; Upload Proof</span>
              <p className="text-[#F0E6FA]/70">Attach your digital bank slip or deposit receipt (JPG/PNG/PDF ≤ 5MB).</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
              <span className="font-heading text-[#D4AF37] font-bold block mb-1">05 &bull; Submit Request</span>
              <p className="text-[#F0E6FA]/70">Click submit. Your pass request is logged into our review queue.</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20">
              <span className="font-heading text-[#D4AF37] font-bold block mb-1">06 &bull; Manual Review</span>
              <p className="text-[#F0E6FA]/70">Our finance desk reconciles transfer with bank statements within 24–48h.</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20 lg:col-span-2">
              <span className="font-heading text-[#FF8FC7] font-bold block mb-1">07 &bull; E-Ticket Delivered</span>
              <p className="text-[#F0E6FA]/70">Upon approval, your high-security encrypted QR admission pass is delivered straight to your email.</p>
            </div>
          </div>
        </div>

        {/* Payment Details + Purchase Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Bank Payment Credentials */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <PaymentDetails />
          </div>

          {/* Right Column: Ticket Form / Submission Result */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <div className="rounded-2xl bg-[#1A0D2E] border border-[#D4AF37]/40 p-6 sm:p-8 shadow-2xl relative">
              {submittedResult ? (
                /* Submission Pending State */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="py-6 text-center flex flex-col items-center justify-center space-y-4"
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

                  <div className="p-4 rounded-xl bg-[#0D0518] border border-[#D4AF37]/30 text-left w-full max-w-md text-xs space-y-2 mt-2">
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
                        {quantity} Pass{quantity > 1 ? 'es' : ''} &bull; Rs. {(quantity * 1000).toLocaleString()}
                      </strong>
                    </div>
                    <div className="pt-2 border-t border-[#D4AF37]/20 flex items-center gap-1.5 text-[11px] text-amber-300">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Once verified, your QR gate pass will be delivered to your inbox.</span>
                    </div>
                  </div>

                  {/* Options: Return to Memoria'26 or Submit Another */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="px-6 py-3 rounded-full font-heading text-xs tracking-wider uppercase font-bold text-[#0D0518] bg-gradient-to-r from-[#D4AF37] via-[#FFB3D9] to-[#D4AF37] hover:shadow-[0_0_20px_#D4AF37] transition-all cursor-pointer"
                    >
                      Return to Memoria&apos;26
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-5 py-3 rounded-full font-heading text-xs tracking-wider uppercase font-semibold text-[#F0E6FA] border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors cursor-pointer"
                    >
                      Submit Another Reservation
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Stable Purchase Form */
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="pb-4 border-b border-[#D4AF37]/20 flex items-center justify-between">
                    <div>
                      <h3 className="font-heading text-xl font-bold text-white">
                        Attendee Information
                      </h3>
                      <p className="font-body text-xs text-[#F0E6FA]/60 mt-0.5">
                        Please enter attendee details exactly as shown on your bank receipt.
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
                  <div className="p-4 rounded-xl bg-[#0D0518]/70 border border-[#D4AF37]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="w-full sm:w-auto">
                      <label className="block text-xs font-heading uppercase tracking-wider text-[#F0E6FA]/80 mb-1">
                        Quantity of Passes
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
                        Total Amount
                      </span>
                      <span className="text-xl sm:text-2xl font-heading font-extrabold text-[#D4AF37]">
                        Rs. {(quantity * 1000).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Payment Slip Upload */}
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
                              {(slipFile.size / 1024).toFixed(1)} KB &bull; Attached
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2">
                          <div className="p-3 rounded-full bg-[#1A0D2E] text-[#D4AF37] group-hover:scale-110 transition-transform">
                            <Ticket className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-heading text-[#F0E6FA] font-medium">
                            Click or drag bank transfer slip here
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
                        <span className="text-[11px] text-[#F0E6FA]/70">Transfer evidence attached</span>
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
                      <span>Submit Reservation — Rs. {(quantity * 1000).toLocaleString()}</span>
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
      </main>
    </div>
  );
};
