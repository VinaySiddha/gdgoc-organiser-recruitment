'use client';

import React from 'react';
import IdentitySelector, { UserIdentity } from './IdentitySelector';

interface NavbarProps {
  activeTab: 'showcase' | 'leaderboard' | 'submit';
  setActiveTab: (tab: 'showcase' | 'leaderboard' | 'submit') => void;
  currentIdentity: UserIdentity;
  onIdentityChange: (identity: UserIdentity) => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  currentIdentity,
  onIdentityChange,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-bold text-xl tracking-tight">
            <span className="text-[#4285F4]">G</span>
            <span className="text-[#EA4335]">D</span>
            <span className="text-[#FBBC05]">G</span>
            <span className="text-[#34A853]">.</span>
            <span className="ml-1.5 text-zinc-900 dark:text-white font-semibold">SVEC</span>
          </div>
          <span className="hidden h-5 w-px bg-zinc-300 dark:bg-zinc-700 sm:block" />
          <span className="hidden text-sm font-medium text-zinc-600 dark:text-zinc-400 sm:inline">
            Project Showcase & Mentorship Portal
          </span>
        </div>

        {/* Identity Selector */}
        <IdentitySelector
          currentIdentity={currentIdentity}
          onIdentityChange={onIdentityChange}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="mx-auto flex max-w-7xl px-4 sm:px-6 lg:px-8 border-t border-zinc-100 dark:border-zinc-900">
        <nav className="-mb-px flex gap-6 overflow-x-auto text-sm font-medium">
          <button
            onClick={() => setActiveTab('showcase')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 transition-colors ${
              activeTab === 'showcase'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 font-semibold'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Showcase Feed
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 transition-colors ${
              activeTab === 'leaderboard'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 font-semibold'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Leaderboard
          </button>

          <button
            onClick={() => setActiveTab('submit')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 transition-colors ${
              activeTab === 'submit'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 font-semibold'
                : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Submit Project
          </button>
        </nav>
      </div>
    </header>
  );
}
