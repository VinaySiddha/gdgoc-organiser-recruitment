import { NextRequest, NextResponse } from 'next/server';
import { globalRepository } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();

    const metrics = globalRepository.getMetrics();
    return NextResponse.json({
      attendees: metrics.recentCheckIns,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch attendees' },
      { status: 500 }
    );
  }
}
