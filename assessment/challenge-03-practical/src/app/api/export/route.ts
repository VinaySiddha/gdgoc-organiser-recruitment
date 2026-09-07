import { NextRequest, NextResponse } from 'next/server';
import { globalRepository } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const metrics = globalRepository.getMetrics();
    
    // Header
    const csvRows: string[] = [
      'Ticket ID,Attendee Name,Department,Check-In Time'
    ];

    for (const checkIn of metrics.recentCheckIns) {
      const row = [
        checkIn.ticketId,
        checkIn.attendeeName,
        checkIn.department,
        checkIn.scannedAt
      ].map((val) => {
        const s = String(val || '');
        if (s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@')) {
          return `"'${s.replace(/"/g, '""')}"`;
        }
        return `"${s.replace(/"/g, '""')}"`;
      }).join(',');
      csvRows.push(row);
    }

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="gdg_devfest_manifest.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate CSV export' },
      { status: 500 }
    );
  }
}
