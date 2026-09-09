import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionDivider } from './SectionDivider';
import { Sparkles, ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'What is the refund and cancellation policy for Memoria’26?',
    answer:
      'Tickets for Memoria’26 are non-refundable once approved by our verification desk, as seating capacities are strictly allocated. However, if your application is rejected during slip verification, no reservation is charged and you may re-apply with corrected proof of payment.',
  },
  {
    question: 'How long does the payment verification and approval turnaround take?',
    answer:
      'Our finance desk typically reviews submissions within 24 to 48 hours of receipt. During peak hours near the event date, approvals are expedited. You will receive an automated notification as soon as your slip matches our bank ledger.',
  },
  {
    question: 'What should I do if I haven’t received my ticket email after approval?',
    answer:
      'First, please inspect your spam/promotions folder for an email from tickets@memoria.lk. If you still cannot locate it, contact our direct WhatsApp support desk with your registered full name and phone number for immediate re-dispatch.',
  },
  {
    question: 'What format does the ticket come in and how do I present it at the gate?',
    answer:
      'Your e-ticket arrives as a secure mobile-ready PDF with a unique cryptographically signed QR code. You can present it directly on your smartphone screen at the entrance scanners, or bring a printed copy.',
  },
  {
    question: 'What is the difference between University Student and Outsider tickets?',
    answer:
      'University Student passes are priced at Rs. 200 and require a valid, unique University Registration Number (e.g. FC122716). Each registration number is strictly eligible for only one student pass. Outsider passes are Rs. 1,000 for external guests, alumni, and general attendees (up to 5 passes per reservation).',
  },
  {
    question: 'Why would a ticket submission be rejected and what is the process?',
    answer:
      'Submissions are only rejected if the uploaded payment slip is unreadable, indicates an incorrect transfer amount, or lacks a matching bank reference number. In such cases, our approver notes the reason, and you can submit a corrected slip.',
  },
];

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-4xl mx-auto">
        <SectionDivider />

        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="font-heading text-xs tracking-[0.35em] text-[#D4AF37] uppercase font-bold inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            ACT VI — CLARIFICATIONS
            <Sparkles className="w-3.5 h-3.5" />
          </span>

          <h2 className="font-heading text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F0E6FA] via-[#FF8FC7] to-[#D4AF37] mt-3">
            Frequently Answered
          </h2>

          <p className="font-body text-base text-[#F0E6FA]/70 mt-3 font-light">
            Everything you need to know about seating, verification, and ticketing policies.
          </p>
        </div>

        {/* FAQ Accordion using Framer Motion AnimatePresence */}
        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="rounded-2xl bg-[#1A0D2E]/60 border border-[#D4AF37]/25 overflow-hidden transition-all duration-300 hover:border-[#D4AF37]/60"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span className="font-heading text-sm sm:text-base font-bold text-white tracking-wide">
                      {faq.question}
                    </span>
                  </div>

                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-[#D4AF37] shrink-0"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-6 sm:px-6 pt-1 text-xs sm:text-sm font-body text-[#F0E6FA]/80 leading-relaxed border-t border-[#D4AF37]/10">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
