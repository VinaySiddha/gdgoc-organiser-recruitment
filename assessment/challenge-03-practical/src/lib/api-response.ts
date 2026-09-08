import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export function successResponse<T>(data: T, message?: string, status = 200) {
  return NextResponse.json(
    { success: true, data, message } as ApiResponse<T>,
    { status }
  );
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json(
    { success: false, error } as ApiResponse,
    { status }
  );
}
