import prisma from '@/lib/prisma';
import { Review, Prisma } from '@/generated/prisma/client';

export interface ReviewWithMentor {
  id: string;
  codeQualityScore: number;
  innovationScore: number;
  completenessScore: number;
  comments: string | null;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
  mentorId: string;
  mentor: {
    id: string;
    name: string;
  };
  reviewScore: number;
}

export interface ProjectReviewsSummary {
  reviews: ReviewWithMentor[];
  numberOfReviews: number;
  averageCodeQuality: number;
  averageInnovation: number;
  averageCompleteness: number;
  overallAverageScore: number;
}

export class ReviewService {
  static async createReview(data: Prisma.ReviewUncheckedCreateInput): Promise<Review> {
    return prisma.review.create({ data });
  }

  static async getReviewByProjectAndMentor(projectId: string, mentorId: string): Promise<Review | null> {
    return prisma.review.findUnique({
      where: {
        projectId_mentorId: {
          projectId,
          mentorId,
        },
      },
    });
  }

  static async getReviewsByProject(projectId: string): Promise<ProjectReviewsSummary> {
    const rawReviews = await prisma.review.findMany({
      where: { projectId },
      select: {
        id: true,
        codeQualityScore: true,
        innovationScore: true,
        completenessScore: true,
        comments: true,
        createdAt: true,
        updatedAt: true,
        projectId: true,
        mentorId: true,
        mentor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const reviewsWithScores: ReviewWithMentor[] = rawReviews.map((review) => {
      const reviewScore =
        (review.codeQualityScore + review.innovationScore + review.completenessScore) / 3;
      return {
        ...review,
        reviewScore: Math.round(reviewScore * 100) / 100,
      };
    });

    const numberOfReviews = reviewsWithScores.length;

    if (numberOfReviews === 0) {
      return {
        reviews: [],
        numberOfReviews: 0,
        averageCodeQuality: 0,
        averageInnovation: 0,
        averageCompleteness: 0,
        overallAverageScore: 0,
      };
    }

    const totalCodeQuality = reviewsWithScores.reduce((sum, r) => sum + r.codeQualityScore, 0);
    const totalInnovation = reviewsWithScores.reduce((sum, r) => sum + r.innovationScore, 0);
    const totalCompleteness = reviewsWithScores.reduce((sum, r) => sum + r.completenessScore, 0);
    const totalReviewScores = reviewsWithScores.reduce((sum, r) => sum + r.reviewScore, 0);

    const averageCodeQuality = Math.round((totalCodeQuality / numberOfReviews) * 100) / 100;
    const averageInnovation = Math.round((totalInnovation / numberOfReviews) * 100) / 100;
    const averageCompleteness = Math.round((totalCompleteness / numberOfReviews) * 100) / 100;
    const overallAverageScore = Math.round((totalReviewScores / numberOfReviews) * 100) / 100;

    return {
      reviews: reviewsWithScores,
      numberOfReviews,
      averageCodeQuality,
      averageInnovation,
      averageCompleteness,
      overallAverageScore,
    };
  }
}
