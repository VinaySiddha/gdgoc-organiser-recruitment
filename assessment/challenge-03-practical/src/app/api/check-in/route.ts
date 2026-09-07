import { NextRequest, NextResponse } from 'next/server';
import { CheckInService } from '@/services/checkInService';

const checkInService = new CheckInService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, scannedBy, deviceInfo } = body;

    const result = checkInService.checkIn(ticketId, scannedBy, deviceInfo);

    const statusCode = result.status === 'VALID_TICKET' ? 200 : result.status === 'ALREADY_CHECKED_IN' ? 409 : 404;

    return NextResponse.json(result, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        status: 'ERROR',
        message: error?.message || 'Internal check-in processing error',
      },
      { status: 500 }
    );
  }
}
