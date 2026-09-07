'use client';
import React from 'react';
import { Navbar } from '../../components/Navbar';
import { QRScanner } from '../../components/QRScanner';

export default function CheckInPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12">
        <QRScanner />
      </main>
    </div>
  );
}
