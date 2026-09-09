import React from 'react';
import { Submission } from '../../api/mockApi';
import { CheckCircle2, XCircle, ArrowLeft, Ticket, Calendar, User } from 'lucide-react';

interface StatusScreenProps {
  status: 'valid' | 'invalid';
  submission?: Submission;
  reason?: string;
  onReset: () => void;
}

export const StatusScreen: React.FC<StatusScreenProps> = ({
  status,
  submission,
  reason,
  onReset,
}) => {
  const isValid = status === 'valid';

  return (
    <div
      className={`min-h-[380px] rounded-2xl p-6 flex flex-col items-center justify-between text-center transition-all ${
        isValid
          ? 'bg-emerald-950/80 border-2 border-emerald-500 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
          : 'bg-rose-950/80 border-2 border-rose-500 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
      }`}
    >
      <div className="space-y-4 flex flex-col items-center">
        {/* Status Icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
            isValid ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
          }`}
        >
          {isValid ? <CheckCircle2 className="w-12 h-12 stroke-[2.5]" /> : <XCircle className="w-12 h-12 stroke-[2.5]" />}
        </div>

        {/* Big Theatrical Verdict */}
        <div>
          <h2
            className={`text-3xl font-black font-heading uppercase tracking-widest ${
              isValid ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isValid ? 'ADMIT' : 'DO NOT ADMIT'}
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mt-1">
            {isValid ? 'Gate Verification Passed' : reason || 'Access Prohibited'}
          </p>
        </div>

        {/* Attendee Details Card if valid */}
        {isValid && submission && (
          <div className="w-full max-w-sm rounded-xl bg-slate-900/80 border border-emerald-500/40 p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-emerald-500/20 pb-2">
              <span className="text-slate-400">Attendee:</span>
              <strong className="text-white text-sm">{submission.name}</strong>
            </div>
            <div className="flex justify-between border-b border-emerald-500/20 pb-2">
              <span className="text-slate-400">Category:</span>
              <span className="font-semibold text-emerald-300">
                {submission.ticketType === 'student' ? (
                  <>Student {submission.universityRegistrationNumber ? `(${submission.universityRegistrationNumber})` : ''}</>
                ) : (
                  'Outsider'
                )}
              </span>
            </div>
            <div className="flex justify-between border-b border-emerald-500/20 pb-2">
              <span className="text-slate-400">Pass Allocation:</span>
              <span className="text-emerald-400 font-bold font-mono text-sm">
                {submission.quantity} Attendee{submission.quantity > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ticket Serial:</span>
              <span className="font-mono text-white font-bold">{submission.ticketId}</span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onReset}
        className={`w-full max-w-sm py-3.5 rounded-xl font-heading text-xs font-bold uppercase tracking-wider transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer ${
          isValid
            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            : 'bg-rose-500 hover:bg-rose-400 text-white'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Scan Next Attendee</span>
      </button>
    </div>
  );
};
