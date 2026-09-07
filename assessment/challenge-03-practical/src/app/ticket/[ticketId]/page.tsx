'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { TicketCard } from '../../../components/TicketCard';
import { RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TicketPage() {
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
        setError(err.message || 'Failed to load ticket pass');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs">Loading digital pass...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-500/50 rounded-3xl p-8 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Ticket Verification Error</h2>
            <p className="text-xs text-red-300">{error}</p>
            <Link
              href="/register"
              className="inline-block py-2.5 px-6 rounded-xl bg-blue-600 text-white font-semibold text-xs"
            >
              Register for a Pass
            </Link>
          </div>
        )}

        {ticketData && <TicketCard ticket={ticketData} />}
      </main>
    </div>
  );
}
