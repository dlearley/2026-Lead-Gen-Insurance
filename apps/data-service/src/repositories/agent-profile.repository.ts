import { PrismaClient } from '@prisma/client';
import { prisma } from '../database/prisma.client.js';

export class AgentProfileRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async getProfile(agentId: string) {
    return this.prisma.agentProfile.findUnique({
      where: { agentId },
    });
  }

  async upsertProfile(agentId: string, data: {
    bio?: string;
    avatar?: string;
    coverImage?: string;
    specialties?: string[];
    interests?: string[];
    website?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    isPublic?: boolean;
  }) {
    return this.prisma.agentProfile.upsert({
      where: { agentId },
      create: {
        agentId,
        bio: data.bio,
        avatar: data.avatar,
        coverImage: data.coverImage,
        specialties: data.specialties || [],
        interests: data.interests || [],
        website: data.website,
        linkedin: data.linkedin,
        twitter: data.twitter,
        facebook: data.facebook,
        isPublic: data.isPublic ?? true,
      },
      update: {
        bio: data.bio,
        avatar: data.avatar,
        coverImage: data.coverImage,
        specialties: data.specialties,
        interests: data.interests,
        website: data.website,
        linkedin: data.linkedin,
        twitter: data.twitter,
        facebook: data.facebook,
        isPublic: data.isPublic,
      },
    });
  }
}

export const agentProfileRepository = new AgentProfileRepository();
