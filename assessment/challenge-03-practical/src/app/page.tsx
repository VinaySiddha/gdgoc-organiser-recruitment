'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import ProjectCard, { ProjectCardData } from '@/components/ProjectCard';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import ProjectSubmissionModal from '@/components/ProjectSubmissionModal';
import LeaderboardTab from '@/components/LeaderboardTab';
import { UserIdentity, DEMO_USERS } from '@/components/IdentitySelector';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'showcase' | 'leaderboard' | 'submit'>('showcase');
  const [currentIdentity, setCurrentIdentity] = useState<UserIdentity>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('gdg_demo_identity');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id && parsed.name && parsed.role) {
            return parsed;
          }
        }
      } catch {
        // Ignore storage error
      }
    }
    return DEMO_USERS[0];
  });

  // Showcase state
  const [projects, setProjects] = useState<ProjectCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Project for Detail Modal
  const [selectedProject, setSelectedProject] = useState<ProjectCardData | null>(null);

  const handleIdentityChange = (identity: UserIdentity) => {
    setCurrentIdentity(identity);
    try {
      localStorage.setItem('gdg_demo_identity', JSON.stringify(identity));
    } catch {
      // Ignore storage errors
    }
  };

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedDomain) params.append('domain', selectedDomain);
      if (selectedYear) params.append('year', selectedYear);
      params.append('page', String(page));
      params.append('limit', '6');

      const res = await fetch(`/api/projects?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.data) {
        setProjects(data.data.projects || []);
        if (data.data.pagination) {
          setTotalCount(data.data.pagination.total);
          setTotalPages(Math.ceil(data.data.pagination.total / data.data.pagination.limit));
        }
      } else {
        setError(data.error || 'Failed to load projects');
      }
    } catch {
      setError('Network error fetching projects from server');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedDomain, selectedYear, page]);

  useEffect(() => {
    if (activeTab === 'showcase') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchProjects();
    }
  }, [activeTab, fetchProjects]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col">
      {/* Global Header / Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentIdentity={currentIdentity}
        onIdentityChange={handleIdentityChange}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'showcase' && (
          <div className="space-y-6">
            {/* Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Student Project Showcase
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Explore innovative engineering projects submitted by GDG SVEC community members.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('submit')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                + Submit Project
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              {/* Search */}
              <div className="sm:col-span-6 relative">
                <input
                  type="text"
                  placeholder="Search by project title or description..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Domain Filter */}
              <div className="sm:col-span-3">
                <select
                  value={selectedDomain}
                  onChange={(e) => {
                    setSelectedDomain(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                >
                  <option value="">All Domains</option>
                  <option value="AI/ML">AI/ML</option>
                  <option value="Web">Web</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Cloud">Cloud</option>
                  <option value="IoT">IoT</option>
                </select>
              </div>

              {/* Year Filter */}
              <div className="sm:col-span-3">
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                >
                  <option value="">All Years</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>
            </div>

            {/* Feed Grid */}
            {isLoading ? (
              <div className="p-12 text-center text-sm text-zinc-500">
                Loading projects...
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-sm font-medium text-center">
                {error}
              </div>
            ) : projects.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">No Projects Found</p>
                <p className="text-xs text-zinc-500 mt-1">Try adjusting your filters or be the first to submit a project!</p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Submit a Project
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onSelect={(p) => setSelectedProject(p)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                    <span className="text-zinc-500">
                      Showing {projects.length} of {totalCount} projects
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
                        disabled={page >= totalPages}
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
        )}

        {activeTab === 'leaderboard' && <LeaderboardTab />}

        {activeTab === 'submit' && (
          <ProjectSubmissionModal
            currentIdentity={currentIdentity}
            onSuccess={() => {
              setActiveTab('showcase');
              fetchProjects();
            }}
            onCancel={() => setActiveTab('showcase')}
          />
        )}
      </main>

      {/* Project Detail & Mentor Review Modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => {
            setSelectedProject(null);
            fetchProjects(); // refresh scores
          }}
          currentIdentity={currentIdentity}
        />
      )}
    </div>
  );
}
