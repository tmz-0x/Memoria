import React from 'react';
import { Users, CheckCircle2 } from 'lucide-react';

interface RunningCounterProps {
  checkedIn: number;
  totalApproved: number;
  percentage: number;
}

export const RunningCounter: React.FC<RunningCounterProps> = ({
  checkedIn,
  totalApproved,
  percentage,
}) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-white shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Gate Attendance
          </span>
        </div>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          {percentage}% Admitted
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-black text-white font-mono">{checkedIn}</span>
        <span className="text-xs text-slate-400">/ {totalApproved} Total Approved Tickets</span>
      </div>

      <div className="mt-3 w-full h-2 bg-slate-900 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
};
