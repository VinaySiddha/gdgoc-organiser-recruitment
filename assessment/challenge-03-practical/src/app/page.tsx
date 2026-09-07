'use client';
import React from 'react';
import Link from 'next/link';
import { Sparkles, QrCode, Award, ArrowRight, ShieldCheck, Zap, Users, BarChart3 } from 'lucide-react';
import { Navbar } from '../components/Navbar';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-purple-600/20 to-amber-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Badge Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-blue-400 font-semibold shadow-lg shadow-blue-500/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            GDG ON CAMPUS SVEC 4.0 • RECRUITMENT & EVENT PORTAL
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight">
            BUILD • LEARN • LEAD <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
              GDG SVEC EventHub
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
            The next-generation event check-in pass, high-speed QR verification system, dynamic personalized social badge generator, and live organizer analytics telemetry.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02]"
            >
              Register & Claim Pass
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/check-in"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              Organizer Check-In Desk
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-8 space-y-4 hover:border-slate-700 transition-all shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Instant QR Entry Passes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Unique ticket generation with encrypted ticket identifiers, duplicate protection, and immediate mobile pass preview.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-8 space-y-4 hover:border-slate-700 transition-all shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Dynamic Social Badges</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Customizable HTML5 Canvas attendee badges ready to download as high-res PNGs and share across LinkedIn and Twitter.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-8 space-y-4 hover:border-slate-700 transition-all shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Live Attendance Telemetry</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Real-time check-in counts, attendance percentages, department distributions, and one-click CSV manifest exports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>GDG on Campus • Sri Vasavi Engineering College (SVEC) • Round 1 Candidate Submission</p>
      </footer>
    </div>
  );
}
