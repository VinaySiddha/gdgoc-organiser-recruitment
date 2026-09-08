import { NextRequest } from 'next/server';
import { ProjectService } from '@/services/project.service';
import { UserService } from '@/services/user.service';
import { validateProjectData } from '@/validators/project.validator';
import { successResponse, errorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await ProjectService.getProjectById(id);

    if (!project) {
      return errorResponse('Project not found', 404);
    }

    return successResponse(project, 'Project retrieved successfully');
  } catch (error: unknown) {
    console.error('Error fetching project:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const existingProject = await ProjectService.getProjectById(id);
    if (!existingProject) {
      return errorResponse('Project not found', 404);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Malformed JSON in request body', 400);
    }

    const validation = validateProjectData(body, true);
    if (!validation.isValid) {
      return errorResponse(validation.errors.join(', '), 400);
    }

    if (body.studentId) {
      const student = await UserService.getUserById(body.studentId);
      if (!student || student.role !== 'STUDENT') {
        return errorResponse('Invalid student ID or user is not a student', 400);
      }
    }

    const updatedProject = await ProjectService.updateProject(id, body);
    return successResponse(updatedProject, 'Project updated successfully');
  } catch (error: unknown) {
    console.error('Error updating project:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const existingProject = await ProjectService.getProjectById(id);
    if (!existingProject) {
      return errorResponse('Project not found', 404);
    }

    await ProjectService.deleteProject(id);
    return successResponse(null, 'Project deleted successfully');
  } catch (error: unknown) {
    console.error('Error deleting project:', error);
    return errorResponse('Internal server error', 500);
  }
}
