'use client';

import React from 'react';

export interface ProjectCardData {
  id: string;
  title: string;
  description: string;
  domain: string;
  year: string;
  techStack: string[];
  githubUrl: string;
  demoUrl?: string | null;
  student?: {
    id: string;
    name: string;
  };
  averageScore?: number;
  reviewCount?: number;
}

interface ProjectCardProps {
  project: ProjectCardData;
  onSelect: (project: ProjectCardData) => void;
}

const DOMAIN_COLORS: Record<string, string> = {
  'AI/ML': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  Web: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  Mobile: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800',
  Cloud: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  IoT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
};

export default function ProjectCard({ project, onSelect }: ProjectCardProps) {
  const domainClass = DOMAIN_COLORS[project.domain] || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
  const score = project.averageScore !== undefined ? project.averageScore : 0;
  const reviewCount = project.reviewCount ?? 0;

  return (
    <div
      onClick={() => onSelect(project)}
      className="group relative flex flex-col justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm transition-all hover:border-blue-500/50 hover:shadow-md cursor-pointer"
    >
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border ${domainClass}`}>
            {project.domain}
          </span>
          <span className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Year {project.year}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {project.title}
        </h3>

        {/* Student Name */}
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5 mb-3">
          by {project.student?.name || 'Anonymous Student'}
        </p>

        {/* Description */}
        <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2 mb-4 leading-relaxed">
          {project.description}
        </p>

        {/* Tech Stack Pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.techStack.map((tech, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
        {/* Review Score Badge */}
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-amber-500 font-semibold">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {reviewCount > 0 ? score.toFixed(1) : 'Unrated'}
          </span>
          <span className="text-zinc-400">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-2">
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            GitHub
          </a>
          {project.demoUrl && (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Demo ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
