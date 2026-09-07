import { NextRequest, NextResponse } from 'next/server';
import { globalRepository } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const metrics = globalRepository.getMetrics();
    return NextResponse.json({ metrics });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}
