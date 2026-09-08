import { NextRequest } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { ProjectService } from '@/services/project.service';
import { UserService } from '@/services/user.service';
import { ReviewService } from '@/services/review.service';
import { validateCreateReviewData } from '@/validators/review.validator';
import { successResponse, errorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    if (!projectId) {
      return errorResponse('Project ID is required', 400);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Malformed JSON in request body', 400);
    }

    // 1. Validate request body schema & values
    const validation = validateCreateReviewData(body);
    if (!validation.isValid) {
      return errorResponse(validation.errors.join(', '), 400);
    }

    const mentorId = body.mentorId as string;
    const codeQualityScore = body.codeQualityScore as number;
    const innovationScore = body.innovationScore as number;
    const completenessScore = body.completenessScore as number;
    const comments = typeof body.comments === 'string' ? body.comments.trim() : undefined;

    // 2. Validate project existence
    const project = await ProjectService.getProjectById(projectId);
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    // 3. Validate user existence and mentor role
    const mentor = await UserService.getUserById(mentorId);
    if (!mentor) {
      return errorResponse('Mentor not found', 404);
    }

    if (mentor.role !== 'MENTOR') {
      return errorResponse('User is not a mentor', 400);
    }

    // 4. Prevent duplicate review by same mentor for the same project
    const existingReview = await ReviewService.getReviewByProjectAndMentor(projectId, mentorId);
    if (existingReview) {
      return errorResponse('Mentor has already reviewed this project', 409);
    }

    // 5. Create review in database
    try {
      const review = await ReviewService.createReview({
        projectId,
        mentorId,
        codeQualityScore,
        innovationScore,
        completenessScore,
        comments,
      });

      const reviewScore =
        Math.round(((codeQualityScore + innovationScore + completenessScore) / 3) * 100) / 100;

      return successResponse(
        { ...review, reviewScore },
        'Review submitted successfully',
        201
      );
    } catch (dbError: unknown) {
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        dbError.code === 'P2002'
      ) {
        return errorResponse('Mentor has already reviewed this project', 409);
      }
      throw dbError;
    }
  } catch (error: unknown) {
    console.error('Error submitting review:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    if (!projectId) {
      return errorResponse('Project ID is required', 400);
    }

    // 1. Verify project exists
    const project = await ProjectService.getProjectById(projectId);
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    // 2. Fetch reviews and summary statistics
    const reviewData = await ReviewService.getReviewsByProject(projectId);

    return successResponse(reviewData, 'Reviews retrieved successfully');
  } catch (error: unknown) {
    console.error('Error fetching reviews:', error);
    return errorResponse('Internal server error', 500);
  }
}
