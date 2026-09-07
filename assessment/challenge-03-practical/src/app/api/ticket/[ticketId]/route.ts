import { NextRequest, NextResponse } from 'next/server';
import { globalRepository } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;
    const ticket = globalRepository.getTicket(ticketId) || globalRepository.getTicketByRollOrEmail(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: `Ticket '${ticketId}' not found` }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}
