'use client';

import React, { useState } from 'react';
import { UserIdentity } from './IdentitySelector';

interface ProjectSubmissionModalProps {
  currentIdentity: UserIdentity;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ProjectSubmissionModal({
  currentIdentity,
  onSuccess,
  onCancel,
}: ProjectSubmissionModalProps) {
  const [studentId, setStudentId] = useState(() =>
    currentIdentity.role === 'STUDENT' ? currentIdentity.id : ''
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('Web');
  const [year, setYear] = useState('2026');
  const [techStackInput, setTechStackInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Basic Client-Side Validation
    const sId = studentId.trim() || currentIdentity.id;
    if (!sId) {
      setError('Student ID is required');
      return;
    }

    if (!title.trim()) {
      setError('Project Title is required');
      return;
    }

    if (!description.trim()) {
      setError('Project Description is required');
      return;
    }

    const techStack = techStackInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (techStack.length === 0) {
      setError('At least one technology must be specified in Tech Stack');
      return;
    }

    try {
      new URL(githubUrl);
    } catch {
      setError('GitHub URL must be a valid URL (e.g. https://github.com/org/repo)');
      return;
    }

    if (demoUrl.trim()) {
      try {
        new URL(demoUrl.trim());
      } catch {
        setError('Demo URL must be a valid URL if provided');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: sId,
          title: title.trim(),
          description: description.trim(),
          domain,
          year,
          techStack,
          githubUrl: githubUrl.trim(),
          demoUrl: demoUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Project submitted successfully to the GDG Showcase!');
        // Reset form
        setTitle('');
        setDescription('');
        setTechStackInput('');
        setGithubUrl('');
        setDemoUrl('');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setError(data.error || 'Failed to submit project');
      }
    } catch {
      setError('Network error submitting project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl my-6">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Submit a New Student Project
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Share your GDG project with mentors and the student community.
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-xs font-medium">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-xs font-medium">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Student User ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. student-uuid"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Project Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={100}
            placeholder="e.g. DevFest AI Assistant"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Domain <span className="text-red-500">*</span>
            </label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
            >
              <option value="AI/ML">AI/ML</option>
              <option value="Web">Web</option>
              <option value="Mobile">Mobile</option>
              <option value="Cloud">Cloud</option>
              <option value="IoT">IoT</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Academic Year <span className="text-red-500">*</span>
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Tech Stack (Comma Separated) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Next.js, React, Tailwind CSS, TypeScript"
            value={techStackInput}
            onChange={(e) => setTechStackInput(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              GitHub Repository URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://github.com/username/project"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Live Demo URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://project.vercel.app"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Project Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            maxLength={2000}
            placeholder="Describe the core features, problem solved, and architecture..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Submitting Project...' : 'Submit Project to Showcase'}
          </button>
        </div>
      </form>
    </div>
  );
}
