import prisma from '@/lib/prisma';
import { Project, Prisma } from '@/generated/prisma/client';

export class ProjectService {
  static async createProject(data: Prisma.ProjectUncheckedCreateInput): Promise<Project> {
    return prisma.project.create({ data });
  }

  static async getProjectById(id: string) {
    const project = await prisma.project.findUnique({ 
      where: { id },
      include: { 
        student: { select: { id: true, name: true, email: true } }, 
        reviews: true 
      }
    });

    if (!project) return null;

    let totalScore = 0;
    if (project.reviews.length > 0) {
      for (const review of project.reviews) {
        totalScore += (review.codeQualityScore + review.innovationScore + review.completenessScore);
      }
    }

    return { 
      ...project, 
      totalScore, 
      averageScore: project.reviews.length > 0 ? totalScore / project.reviews.length : 0 
    };
  }

  static async updateProject(id: string, data: Prisma.ProjectUncheckedUpdateInput): Promise<Project> {
    return prisma.project.update({ where: { id }, data });
  }

  static async deleteProject(id: string): Promise<Project> {
    return prisma.project.delete({ where: { id } });
  }

  static async getAllProjects(params: { search?: string, domain?: string, year?: string, techStack?: string, skip?: number, take?: number }) {
    const where: Prisma.ProjectWhereInput = {};
    
    if (params.domain) where.domain = params.domain;
    if (params.year) where.year = params.year;
    if (params.techStack) where.techStack = { has: params.techStack };
    
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({ 
        where,
        skip: params.skip ?? 0,
        take: params.take ?? 10,
        include: { 
           student: { select: { id: true, name: true } },
           reviews: { select: { codeQualityScore: true, innovationScore: true, completenessScore: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.project.count({ where })
    ]);

    return { projects, totalCount };
  }
}
