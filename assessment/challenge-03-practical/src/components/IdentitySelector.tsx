'use client';

import React from 'react';

export interface UserIdentity {
  id: string;
  name: string;
  role: 'STUDENT' | 'MENTOR';
}

export const DEMO_USERS: UserIdentity[] = [
  { id: 'demo-student-1', name: 'Aarav Sharma', role: 'STUDENT' },
  { id: 'demo-student-2', name: 'Diya Patel', role: 'STUDENT' },
  { id: 'demo-mentor-1', name: 'Dr. Vikram Seth', role: 'MENTOR' },
  { id: 'demo-mentor-2', name: 'Priya Sundaram', role: 'MENTOR' },
];

interface IdentitySelectorProps {
  currentIdentity: UserIdentity;
  onIdentityChange: (identity: UserIdentity) => void;
}

export default function IdentitySelector({ currentIdentity, onIdentityChange }: IdentitySelectorProps) {
  const [customId, setCustomId] = React.useState('');
  const [customName, setCustomName] = React.useState('');
  const [customRole, setCustomRole] = React.useState<'STUDENT' | 'MENTOR'>('STUDENT');
  const [isCustom, setIsCustom] = React.useState(false);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustom(true);
      return;
    }

    setIsCustom(false);
    const found = DEMO_USERS.find((u) => u.id === val);
    if (found) {
      onIdentityChange(found);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customId.trim() || !customName.trim()) return;
    onIdentityChange({
      id: customId.trim(),
      name: customName.trim(),
      role: customRole,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold text-zinc-500 dark:text-zinc-400">Demo Identity:</span>
      <select
        value={isCustom ? 'custom' : currentIdentity.id}
        onChange={handleSelectChange}
        className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {DEMO_USERS.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.role === 'STUDENT' ? 'Student' : 'Mentor'})
          </option>
        ))}
        <option value="custom">Custom ID...</option>
      </select>

      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
          currentIdentity.role === 'MENTOR'
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
        }`}
      >
        {currentIdentity.role}
      </span>

      {isCustom && (
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 mt-1 sm:mt-0">
          <input
            type="text"
            placeholder="UUID / ID"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            className="w-24 rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 bg-white dark:bg-zinc-800"
          />
          <input
            type="text"
            placeholder="Name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="w-24 rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 bg-white dark:bg-zinc-800"
          />
          <select
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value as 'STUDENT' | 'MENTOR')}
            className="rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 bg-white dark:bg-zinc-800"
          >
            <option value="STUDENT">Student</option>
            <option value="MENTOR">Mentor</option>
          </select>
          <button
            type="submit"
            className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700 font-medium"
          >
            Set
          </button>
        </form>
      )}
    </div>
  );
}
