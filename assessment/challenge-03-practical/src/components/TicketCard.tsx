'use client';
import React from 'react';
import Link from 'next/link';
import { QrCode, Calendar, MapPin, User, CheckCircle2, Award, Download, ArrowRight } from 'lucide-react';

interface TicketCardProps {
  ticket: {
    id: string;
    status: string;
    issuedAt: string;
    attendee?: {
      fullName: string;
      email: string;
      rollNumber: string;
      department: string;
      year: string;
    };
  };
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const isCheckedIn = ticket.status === 'CHECKED_IN';
  const attendee = ticket.attendee || {
    fullName: 'Attendee',
    email: 'student@svec.edu.in',
    rollNumber: '23A81A4397',
    department: 'CSE',
    year: '2nd Year',
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/10 transition-all">
      {/* Ticket Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white relative">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
              Official Entry Pass
            </span>
            <h2 className="text-2xl font-black mt-2 tracking-tight">GDG DevFest 2026</h2>
            <p className="text-xs text-blue-100 font-medium">SVEC Campus • 4.0 Edition</p>
          </div>
          <div className="text-right font-mono text-xs bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-300 block uppercase">Pass ID</span>
            <span className="font-bold text-amber-300">{ticket.id}</span>
          </div>
        </div>

        {/* Status Chip */}
        <div className="mt-4 flex items-center gap-2">
          {isCheckedIn ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/90 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg shadow-emerald-900/40">
              <CheckCircle2 className="w-3.5 h-3.5" /> Checked In & Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-amber-500/90 text-slate-950 text-xs px-3 py-1 rounded-full font-bold shadow-lg shadow-amber-900/40">
              Pass Active • Pending Check-in
            </span>
          )}
        </div>
      </div>

      {/* Ticket Body */}
      <div className="p-6 space-y-6 text-slate-200">
        {/* Attendee Details Grid */}
        <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Attendee Name</span>
            <span className="text-sm font-bold text-white truncate block">{attendee.fullName}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Roll Number</span>
            <span className="text-sm font-mono font-bold text-blue-400">{attendee.rollNumber}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Department</span>
            <span className="text-sm font-semibold text-slate-200">{attendee.department}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Year of Study</span>
            <span className="text-sm font-semibold text-slate-200">{attendee.year}</span>
          </div>
        </div>

        {/* Event Schedule Info */}
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Saturday, September 20, 2026 • 09:00 AM IST</span>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-purple-400" />
            <span>Main Auditorium, Sri Vasavi Engineering College (SVEC)</span>
          </div>
        </div>

        {/* QR Section */}
        <div className="border-t border-dashed border-slate-800 pt-6 text-center">
          <div className="inline-block p-4 bg-white rounded-2xl shadow-xl shadow-black/50">
            {/* Visual QR Placeholder / Rendered SVG */}
            <div className="w-40 h-40 bg-slate-950 rounded-xl p-2 flex flex-col items-center justify-center text-white relative">
              <QrCode className="w-28 h-28 text-white" />
              <span className="text-[9px] font-mono text-blue-400 mt-1 tracking-wider">{ticket.id}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Present this QR pass at the registration desk for instant entry.
          </p>
        </div>

        {/* Next Actions */}
        <div className="pt-2 flex flex-col gap-2.5">
          <Link
            href={`/badge/${ticket.id}`}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01]"
          >
            <Award className="w-4 h-4 text-amber-300" />
            Customize & Generate Social Badge
            <ArrowRight className="w-3.5 h-3.5 ml-auto" />
          </Link>
        </div>
      </div>
    </div>
  );
};
