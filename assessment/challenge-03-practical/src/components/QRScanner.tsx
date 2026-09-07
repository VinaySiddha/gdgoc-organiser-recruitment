'use client';
import React, { useState } from 'react';
import { QrCode, Search, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface CheckInResponse {
  success: boolean;
  status: 'VALID_TICKET' | 'ALREADY_CHECKED_IN' | 'INVALID_TICKET' | 'ERROR';
  message: string;
  ticketId?: string;
  attendee?: {
    fullName: string;
    email?: string;
    rollNumber?: string;
    department?: string;
    year?: string;
  };
  checkInTime?: string;
}

export const QRScanner: React.FC = () => {
  const [ticketInput, setTicketInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketInput.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticketInput.trim(), scannedBy: 'ORGANIZER_DESK_WEB' }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        status: 'ERROR',
        message: err?.message || 'Network connection failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTicketInput('');
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Scanner Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10" />

        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold">
            <QrCode className="w-3.5 h-3.5" />
            Organizer Desk Scanner
          </div>
          <h2 className="text-2xl font-bold tracking-tight">GDG DevFest Attendance Verification</h2>
          <p className="text-xs text-slate-400">
            Scan attendee QR code or enter ticket ID / Roll number below for instant check-in.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleManualCheckIn} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              placeholder="e.g. TICK-GDG-XXXXXX or paste QR payload"
              className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !ticketInput.trim()}
              className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Verify & Check In Attendee
            </button>
            {result && (
              <button
                type="button"
                onClick={handleReset}
                className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Result States */}
        {result && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            {result.status === 'VALID_TICKET' && (
              <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-5 text-emerald-200 space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>CHECK-IN SUCCESSFUL • VALID TICKET</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Attendee</span>
                    <span className="text-white font-bold text-sm">{result.attendee?.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Roll Number</span>
                    <span className="font-mono text-emerald-300 font-semibold">{result.attendee?.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Department</span>
                    <span className="text-slate-200">{result.attendee?.department} ({result.attendee?.year})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Ticket ID</span>
                    <span className="font-mono text-slate-200">{result.ticketId}</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href={`/badge/${result.ticketId}`}
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold hover:underline"
                  >
                    Open Dynamic Social Badge <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {result.status === 'ALREADY_CHECKED_IN' && (
              <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-5 text-amber-200 space-y-3">
                <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  <span>DUPLICATE ATTEMPT • ALREADY CHECKED IN</span>
                </div>
                <p className="text-xs text-amber-300/90">{result.message}</p>
                {result.attendee && (
                  <div className="text-xs bg-slate-950/60 p-3 rounded-xl">
                    <span className="text-slate-400">Registered to: </span>
                    <span className="text-white font-bold">{result.attendee.fullName}</span> ({result.attendee.department})
                  </div>
                )}
              </div>
            )}

            {result.status === 'INVALID_TICKET' && (
              <div className="bg-red-950/40 border border-red-500/50 rounded-2xl p-5 text-red-200 space-y-2">
                <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
                  <XCircle className="w-5 h-5" />
                  <span>INVALID TICKET IDENTIFIER</span>
                </div>
                <p className="text-xs text-red-300/90">{result.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
