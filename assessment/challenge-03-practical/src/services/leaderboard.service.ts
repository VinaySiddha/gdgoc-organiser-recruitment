import prisma from '@/lib/prisma';

export interface LeaderboardEntry {
  rank: number;
  projectId: string;
  projectTitle: string;
  studentName: string;
  domain: string;
  year: string;
  overallScore: number;
  numberOfReviews: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class LeaderboardService {
  static async getLeaderboard(page: number = 1, limit: number = 10): Promise<LeaderboardResponse> {
    // 1. Fetch all projects that have at least one review.
    // In a production environment with millions of rows, we might use a materialized view
    // or raw SQL to calculate the average directly in the database for efficiency.
    // For this assessment, fetching and calculating in-memory is the most understandable
    // and Prisma-friendly approach without resorting to complex raw SQL queries.
    const projects = await prisma.project.findMany({
      where: {
        reviews: {
          some: {}, // Only projects with at least one review
        },
      },
      select: {
        id: true,
        title: true,
        domain: true,
        year: true,
        createdAt: true, // For deterministic tie-breaking
        student: {
          select: {
            name: true,
          },
        },
        reviews: {
          select: {
            codeQualityScore: true,
            innovationScore: true,
            completenessScore: true,
          },
        },
      },
    });

    // 2. Calculate the overall score for each project
    const scoredProjects = projects.map((project) => {
      let totalReviewScore = 0;

      for (const review of project.reviews) {
        const reviewScore = (review.codeQualityScore + review.innovationScore + review.completenessScore) / 3;
        totalReviewScore += reviewScore;
      }

      const overallScore = totalReviewScore / project.reviews.length;

      return {
        ...project,
        overallScore: Math.round(overallScore * 100) / 100, // Round to 2 decimal places
        numberOfReviews: project.reviews.length,
      };
    });

    // 3. Sort by overall score descending.
    // 4. Tie-breaker: If scores are equal, sort by creation date ascending (older first)
    scoredProjects.sort((a, b) => {
      if (b.overallScore !== a.overallScore) {
        return b.overallScore - a.overallScore; // Descending
      }
      // Tie-breaker
      return a.createdAt.getTime() - b.createdAt.getTime(); // Ascending
    });

    // 5. Apply pagination and assign rank
    const total = scoredProjects.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    
    // Assign ranks to the entire list before slicing so ranks are globally correct
    const rankedProjects: LeaderboardEntry[] = scoredProjects.map((project, index) => ({
      rank: index + 1,
      projectId: project.id,
      projectTitle: project.title,
      studentName: project.student.name,
      domain: project.domain,
      year: project.year,
      overallScore: project.overallScore,
      numberOfReviews: project.numberOfReviews,
    }));

    const paginatedLeaderboard = rankedProjects.slice(skip, skip + limit);

    return {
      leaderboard: paginatedLeaderboard,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
