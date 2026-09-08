import { NextRequest } from 'next/server';
import { LeaderboardService } from '@/services/leaderboard.service';
import { successResponse, errorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Parse and validate pagination parameters
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    
    let page = 1;
    let limit = 10;
    
    if (pageParam !== null) {
      const parsedPage = parseInt(pageParam, 10);
      if (isNaN(parsedPage) || parsedPage < 1) {
        return errorResponse('Invalid page parameter. Must be a positive integer.', 400);
      }
      page = parsedPage;
    }
    
    if (limitParam !== null) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return errorResponse('Invalid limit parameter. Must be a positive integer.', 400);
      }
      limit = parsedLimit;
    }

    // Call service layer for business logic
    const result = await LeaderboardService.getLeaderboard(page, limit);

    return successResponse(
      result,
      'Leaderboard retrieved successfully'
    );
  } catch (error: unknown) {
    console.error('Error fetching leaderboard:', error);
    return errorResponse('Internal server error', 500);
  }
}
