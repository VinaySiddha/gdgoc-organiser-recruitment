'use client';

import React, { useEffect, useState } from 'react';

interface LeaderboardItem {
  rank: number;
  projectId: string;
  projectTitle: string;
  studentName: string;
  domain: string;
  year: string;
  overallScore: number;
  numberOfReviews: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function LeaderboardTab() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/leaderboard?page=${page}&limit=10`);
        const json = await res.json();
        if (active) {
          if (json.success) {
            setData(json.data);
          } else {
            setError(json.error || 'Failed to fetch leaderboard');
          }
        }
      } catch {
        if (active) setError('Network error fetching leaderboard');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchLeaderboard();
    return () => {
      active = false;
    };
  }, [page]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700 px-3 py-1 text-xs font-bold shadow-sm">
          🥇 Rank #1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-bold shadow-sm">
          🥈 Rank #2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-900 border border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700 px-3 py-1 text-xs font-bold shadow-sm">
          🥉 Rank #3
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        #{rank}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-2xl">
          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-md mb-3">
            🏆 Official GDG DevFest Standings
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Student Project Leaderboard
          </h1>
          <p className="mt-2 text-sm text-blue-100 leading-relaxed">
            Rankings are dynamically calculated based on mentor evaluation scores across Code Quality, Innovation, and Completeness.
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-zinc-500">
          Loading leaderboard standings...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-sm font-medium text-center">
          {error}
        </div>
      ) : !data || data.leaderboard.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">No Rated Projects Yet</p>
          <p className="text-xs text-zinc-500 mt-1">Projects will appear on the leaderboard once they receive mentor reviews.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Leaderboard Cards */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            {data.leaderboard.map((item) => (
              <div
                key={item.projectId}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 transition-colors ${
                  item.rank <= 3 ? 'bg-zinc-50/70 dark:bg-zinc-800/30' : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div>{getRankBadge(item.rank)}</div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
                      {item.projectTitle}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      by <span className="font-semibold text-zinc-700 dark:text-zinc-300">{item.studentName}</span> • {item.domain} ({item.year})
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                  <div className="text-right">
                    <span className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Reviews</span>
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{item.numberOfReviews}</span>
                  </div>

                  <div className="text-right">
                    <span className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Overall Score</span>
                    <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                      {item.overallScore.toFixed(2)} <span className="text-xs text-zinc-400">/ 10</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs">
              <span className="text-zinc-500">
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} ranked projects)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 font-medium disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Previous
                </button>
                <button
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 font-medium disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
