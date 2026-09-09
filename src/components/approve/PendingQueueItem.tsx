import React from 'react';
import { Submission } from '../../api/mockApi';
import { Clock, Ticket, ChevronRight, User, Eye } from 'lucide-react';

interface PendingQueueItemProps {
  submission: Submission;
  isSelected: boolean;
  onSelect: (sub: Submission) => void;
}

export const PendingQueueItem: React.FC<PendingQueueItemProps> = ({
  submission,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(submission)}
      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
        isSelected
          ? 'bg-blue-50/80 border-blue-500 shadow-sm'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
          <User className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-900 truncate">
              {submission.name}
            </h4>
            <span className="font-mono text-[10px] text-slate-400">
              {submission.id}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 truncate">
            {submission.email} &bull; {submission.phone}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {submission.ticketType === 'student' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                <Ticket className="w-3 h-3" />
                Student {submission.universityRegistrationNumber ? `• ${submission.universityRegistrationNumber}` : ''} (Rs. {(submission.totalPrice ?? 200).toLocaleString()})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                <Ticket className="w-3 h-3" />
                {submission.quantity} Outsider Pass{submission.quantity > 1 ? 'es' : ''} (Rs. {(submission.totalPrice ?? submission.quantity * 1000).toLocaleString()})
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="w-3 h-3" />
              {new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-slate-400 shrink-0">
        <span className="text-[11px] font-medium hidden sm:inline text-blue-600 hover:underline">
          Review Slip
        </span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
};
