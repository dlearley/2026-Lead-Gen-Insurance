import { PrismaClient, PostCategory } from '@prisma/client';
import { prisma } from '../database/prisma.client.js';

export class CommunityRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createPost(authorId: string, data: { title: string; content: string; category?: PostCategory }) {
    return this.prisma.communityPost.create({
      data: {
        authorId,
        title: data.title,
        content: data.content,
        category: data.category || PostCategory.GENERAL,
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getPosts(params: {
    category?: PostCategory;
    skip?: number;
    take?: number;
    search?: string;
  }) {
    const where: any = {};
    if (params.category) {
      where.category = params.category;
    }
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { content: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.communityPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip || 0,
      take: params.take || 20,
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });
  }

  async getPostById(id: string) {
    return this.prisma.communityPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                likes: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });
  }

  async createComment(postId: string, authorId: string, content: string) {
    return this.prisma.communityComment.create({
      data: {
        postId,
        authorId,
        content,
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async toggleLike(agentId: string, target: { postId?: string; commentId?: string }) {
    const where: any = { agentId };
    if (target.postId) where.postId = target.postId;
    else if (target.commentId) where.commentId = target.commentId;
    else throw new Error('postId or commentId must be provided');

    const existingLike = await this.prisma.communityLike.findFirst({
      where,
    });

    if (existingLike) {
      await this.prisma.communityLike.delete({
        where: { id: existingLike.id },
      });
      return { liked: false };
    } else {
      await this.prisma.communityLike.create({
        data: {
          agentId,
          postId: target.postId,
          commentId: target.commentId,
        },
      });
      return { liked: true };
    }
  }

  async getSuccessStories(limit: number = 5) {
    return this.getPosts({
      category: PostCategory.SUCCESS_STORY,
      take: limit,
    });
  }

  async getTargetAuthorId(params: { postId?: string; commentId?: string }): Promise<string | null> {
    if (params.postId) {
      const post = await this.prisma.communityPost.findUnique({
        where: { id: params.postId },
        select: { authorId: true },
      });
      return post?.authorId || null;
    }
    if (params.commentId) {
      const comment = await this.prisma.communityComment.findUnique({
        where: { id: params.commentId },
        select: { authorId: true },
      });
      return comment?.authorId || null;
    }
    return null;
  }
}

export const communityRepository = new CommunityRepository();
