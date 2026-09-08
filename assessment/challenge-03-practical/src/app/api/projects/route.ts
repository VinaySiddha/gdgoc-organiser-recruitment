import { NextRequest } from 'next/server';
import { ProjectService } from '@/services/project.service';
import { UserService } from '@/services/user.service';
import { validateProjectData } from '@/validators/project.validator';
import { successResponse, errorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Malformed JSON in request body', 400);
    }

    const validation = validateProjectData(body, false);
    if (!validation.isValid) {
      return errorResponse(validation.errors.join(', '), 400);
    }

    const student = await UserService.getUserById(body.studentId);
    if (!student || student.role !== 'STUDENT') {
      return errorResponse('Invalid student ID or user is not a student', 400);
    }

    const project = await ProjectService.createProject({
      title: body.title,
      description: body.description,
      domain: body.domain,
      year: body.year,
      techStack: body.techStack,
      githubUrl: body.githubUrl,
      demoUrl: body.demoUrl,
      studentId: body.studentId,
    });

    return successResponse(project, 'Project created successfully', 201);
  } catch (error: unknown) {
    console.error('Error creating project:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const domain = searchParams.get('domain') || undefined;
    const year = searchParams.get('year') || undefined;
    const techStack = searchParams.get('techStack') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));

    const skip = (page - 1) * limit;

    const result = await ProjectService.getAllProjects({ search, domain, year, techStack, skip, take: limit });

    const enhancedProjects = result.projects.map(p => {
      let totalScore = 0;
      if (p.reviews.length > 0) {
        for (const review of p.reviews) {
          totalScore += (review.codeQualityScore + review.innovationScore + review.completenessScore);
        }
      }
      return {
        ...p,
        averageScore: p.reviews.length > 0 ? totalScore / p.reviews.length : 0,
        reviewCount: p.reviews.length
      };
    });

    return successResponse(
      { projects: enhancedProjects, pagination: { total: result.totalCount, page, limit } },
      'Projects retrieved successfully'
    );
  } catch (error: unknown) {
    console.error('Error fetching projects:', error);
    return errorResponse('Internal server error', 500);
  }
}
