import { NextRequest, NextResponse } from 'next/server';
import { RegistrationService } from '@/services/registrationService';

const registrationService = new RegistrationService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = registrationService.register(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
