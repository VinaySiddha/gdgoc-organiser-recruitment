'use client';
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { DashboardCharts } from '../../components/DashboardCharts';
import { DashboardMetrics } from '../../models/types';
import { RefreshCw } from 'lucide-react';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRegistrations: 0,
    totalCheckIns: 0,
    attendancePercentage: 0,
    departmentBreakdown: {},
    recentCheckIns: [],
    hourlyVelocity: {},
  });
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [resMetrics, resAttendees] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/attendees'),
      ]);
      if (resMetrics.ok) {
        const dataM = await resMetrics.json();
        if (dataM.success && dataM.data) {
          setMetrics(dataM.data);
        }
      }
      if (resAttendees.ok) {
        const dataA = await resAttendees.json();
        if (dataA.success && dataA.attendees) {
          setAttendees(dataA.attendees);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs">Aggregating attendance telemetry...</p>
          </div>
        ) : (
          <DashboardCharts initialMetrics={metrics} attendeesList={attendees} />
        )}
      </main>
    </div>
  );
}
