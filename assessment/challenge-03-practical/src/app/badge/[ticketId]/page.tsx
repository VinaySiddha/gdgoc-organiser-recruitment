'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { BadgeCanvas } from '../../../components/BadgeCanvas';
import { RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BadgePage() {
  const params = useParams();
  const ticketId = params?.ticketId as string;
  const [ticketData, setTicketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) return;

    const fetchTicket = async () => {
      try {
        const res = await fetch(`/api/ticket/${ticketId}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Ticket not found');
        }
        setTicketData(data.ticket);
      } catch (err: any) {
        setError(err.message || 'Failed to load ticket information');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        <Link
          href={`/ticket/${ticketId}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Pass
        </Link>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs">Preparing badge generator...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-500/50 rounded-3xl p-8 text-center space-y-4 max-w-md mx-auto">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Attendee Verification Error</h2>
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {ticketData && (
          <BadgeCanvas
            attendeeName={ticketData.attendee?.fullName || 'Candidate'}
            department={ticketData.attendee?.department || 'Engineering'}
            year={ticketData.attendee?.year || '2nd Year'}
            ticketId={ticketData.id}
          />
        )}
      </main>
    </div>
  );
}
