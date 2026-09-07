'use client';
import React, { useState } from 'react';
import { Users, CheckCircle, Percent, Download, Search, RefreshCw, BarChart2, Layers } from 'lucide-react';
import { DashboardMetrics } from '../models/types';

interface DashboardProps {
  initialMetrics: DashboardMetrics;
  attendeesList?: Array<{
    id: string;
    fullName: string;
    email: string;
    rollNumber: string;
    department: string;
    year: string;
    ticketId: string;
    status: string;
    scannedAt?: string;
  }>;
}

export const DashboardCharts: React.FC<DashboardProps> = ({ initialMetrics, attendeesList = [] }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');

  const filteredAttendees = attendeesList.filter((a) => {
    const matchesSearch =
      a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.ticketId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === 'ALL' || a.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const handleExportCSV = () => {
    window.open('/api/export', '_blank');
  };

  return (
    <div className="space-y-8 text-white max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div>
          <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full font-semibold">
            Live Organizer Telemetry
          </span>
          <h1 className="text-2xl font-bold tracking-tight mt-1">GDG DevFest 2026 Live Dashboard</h1>
          <p className="text-xs text-slate-400">Real-time attendance rates, check-in velocity, and department distributions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            Export Attendee Manifest (CSV)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Registrations</span>
              <h2 className="text-3xl font-black text-white mt-1">{metrics.totalRegistrations}</h2>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4">100% capacity tracked in SQLite</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Verified Check-Ins</span>
              <h2 className="text-3xl font-black text-emerald-400 mt-1">{metrics.totalCheckIns}</h2>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4">Protected against duplicate scan collisions</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Turnout Percentage</span>
              <h2 className="text-3xl font-black text-amber-400 mt-1">{metrics.attendancePercentage}%</h2>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.attendancePercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-base font-bold flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-purple-400" />
          Department Participation Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(metrics.departmentBreakdown).map(([dept, counts]) => (
            <div key={dept} className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <span className="text-xs font-bold text-white block">{dept}</span>
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>Registered: <strong className="text-slate-200">{counts.registered}</strong></span>
                <span>Present: <strong className="text-emerald-400">{counts.checkedIn}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendee Directory Table & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Attendee Roster & Live Status
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ADS">ADS</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
            </select>
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search name, roll, ticket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3.5 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Attendee Name</th>
                <th className="py-3 px-4 font-semibold">Roll Number</th>
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold">Ticket ID</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAttendees.length > 0 ? (
                filteredAttendees.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{att.fullName}</td>
                    <td className="py-3 px-4 font-mono text-blue-400">{att.rollNumber}</td>
                    <td className="py-3 px-4">{att.department} ({att.year})</td>
                    <td className="py-3 px-4 font-mono">{att.ticketId}</td>
                    <td className="py-3 px-4">
                      {att.status === 'CHECKED_IN' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
                          Checked In
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-[10px]">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No attendees match search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
