'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ProjectCardData } from './ProjectCard';
import { UserIdentity } from './IdentitySelector';

interface ReviewItem {
  id: string;
  codeQualityScore: number;
  innovationScore: number;
  completenessScore: number;
  comments: string | null;
  createdAt: string;
  mentorId: string;
  mentor: {
    id: string;
    name: string;
  };
  reviewScore: number;
}

interface ReviewsSummary {
  reviews: ReviewItem[];
  numberOfReviews: number;
  averageCodeQuality: number;
  averageInnovation: number;
  averageCompleteness: number;
  overallAverageScore: number;
}

interface ProjectDetailModalProps {
  project: ProjectCardData | null;
  onClose: () => void;
  currentIdentity: UserIdentity;
}

export default function ProjectDetailModal({
  project,
  onClose,
  currentIdentity,
}: ProjectDetailModalProps) {
  const [reviewSummary, setReviewSummary] = useState<ReviewsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review Form state
  const [mentorIdInput, setMentorIdInput] = useState(() =>
    currentIdentity.role === 'MENTOR' ? currentIdentity.id : ''
  );
  const [codeQuality, setCodeQuality] = useState(8);
  const [innovation, setInnovation] = useState(8);
  const [completeness, setCompleteness] = useState(8);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!project) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/reviews`);
      const data = await res.json();
      if (data.success) {
        setReviewSummary(data.data);
      } else {
        setError(data.error || 'Failed to load reviews');
      }
    } catch {
      setError('Network error fetching reviews');
    } finally {
      setIsLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (project) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchReviews();
    }
  }, [project, fetchReviews]);

  if (!project) return null;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);

    const mId = mentorIdInput.trim() || currentIdentity.id;

    if (!mId) {
      setFormMessage({ type: 'error', text: 'Mentor ID is required to submit a review' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: mId,
          codeQualityScore: Number(codeQuality),
          innovationScore: Number(innovation),
          completenessScore: Number(completeness),
          comments: comments.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFormMessage({ type: 'success', text: 'Review submitted successfully!' });
        setComments('');
        fetchReviews(); // Refresh review list & calculated averages
      } else {
        setFormMessage({ type: 'error', text: data.error || 'Failed to submit review' });
      }
    } catch {
      setFormMessage({ type: 'error', text: 'Network error submitting review' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-0.5 text-xs font-semibold">
                {project.domain}
              </span>
              <span className="rounded-md bg-zinc-200 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Year {project.year}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {project.title}
            </h2>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">
              Submitted by <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{project.student?.name || 'Student'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Description</h4>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* Tech Stack & Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Technologies Used</h4>
              <div className="flex flex-wrap gap-1.5">
                {project.techStack.map((tech, i) => (
                  <span key={i} className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Project Resources</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 text-white px-3 py-1.5 font-medium hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  GitHub Repository ↗
                </a>
                {project.demoUrl && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 text-white px-3 py-1.5 font-medium hover:bg-blue-700"
                  >
                    Live Demo ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Score Summary Section */}
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-3">
              Mentor Evaluation Summary
            </h3>

            {isLoading ? (
              <div className="p-4 text-center text-xs text-zinc-500">Loading reviews...</div>
            ) : error ? (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>
            ) : reviewSummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                  <div className="text-center">
                    <span className="block text-xs font-medium text-zinc-500">Overall Score</span>
                    <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                      {reviewSummary.overallAverageScore.toFixed(1)} <span className="text-xs text-zinc-400">/ 10</span>
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs font-medium text-zinc-500">Code Quality</span>
                    <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                      {reviewSummary.averageCodeQuality.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs font-medium text-zinc-500">Innovation</span>
                    <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                      {reviewSummary.averageInnovation.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs font-medium text-zinc-500">Completeness</span>
                    <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                      {reviewSummary.averageCompleteness.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Existing Reviews List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Reviews ({reviewSummary.numberOfReviews})
                  </h4>

                  {reviewSummary.reviews.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                      No mentor reviews submitted yet. Be the first mentor to evaluate this project!
                    </p>
                  ) : (
                    reviewSummary.reviews.map((rev) => (
                      <div key={rev.id} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {rev.mentor?.name || 'Mentor'}
                          </span>
                          <span className="font-bold text-amber-500">
                            Score: {rev.reviewScore.toFixed(1)} / 10
                          </span>
                        </div>
                        <div className="flex gap-3 text-[11px] text-zinc-500">
                          <span>Code: {rev.codeQualityScore}</span>
                          <span>Innovation: {rev.innovationScore}</span>
                          <span>Completeness: {rev.completenessScore}</span>
                        </div>
                        {rev.comments && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 italic pt-1">
                            &quot;{rev.comments}&quot;
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Submit Review Form */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">
              Submit Mentor Review
            </h3>

            {formMessage && (
              <div
                className={`mb-3 p-2.5 rounded-lg text-xs font-medium ${
                  formMessage.type === 'success'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                }`}
              >
                {formMessage.text}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Mentor User ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. mentor-uuid"
                  value={mentorIdInput}
                  onChange={(e) => setMentorIdInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                />
              </div>

              {/* Scores Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Code Quality ({codeQuality}/10)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={codeQuality}
                    onChange={(e) => setCodeQuality(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Innovation ({innovation}/10)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={innovation}
                    onChange={(e) => setInnovation(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Completeness ({completeness}/10)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={completeness}
                    onChange={(e) => setCompleteness(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Comments / Feedback (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Share constructive feedback for the student team..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Submitting Review...' : 'Submit Mentor Review'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
