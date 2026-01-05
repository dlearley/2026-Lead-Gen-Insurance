// Conversation Service - Manage conversations and participants

import { PrismaClient } from '@prisma/client'
import { CreateConversationInput, Conversation, ConversationParticipant } from './types.js'

export class ConversationService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const { organizationId, name, type, participantIds } = input

    return this.prisma.$transaction(async (tx) => {
      // Create conversation
      const conversation = await tx.conversation.create({
        data: {
          organizationId,
          name,
          type,
        },
      })

      // Add participants
      await tx.conversationParticipant.createMany({
        data: participantIds.map((userId) => ({
          conversationId: conversation.id,
          userId,
          role: 'member',
        })),
      })

      return conversation
    })
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    })
  }

  async listConversations(organizationId: string, userId: string): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: {
        organizationId,
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: true,
      },
      orderBy: { lastMessageAt: 'desc' },
    })
  }

  async updateConversation(
    conversationId: string,
    data: Partial<Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data,
    })
  }

  async deleteConversation(conversationId: string): Promise<Conversation> {
    return this.prisma.conversation.delete({
      where: { id: conversationId },
    })
  }

  async addParticipant(
    conversationId: string,
    userId: string,
    role: 'member' | 'moderator' | 'admin' = 'member'
  ): Promise<ConversationParticipant> {
    return this.prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId,
        role,
      },
    })
  }

  async removeParticipant(conversationId: string, userId: string): Promise<ConversationParticipant> {
    return this.prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    })
  }

  async updateParticipantRole(
    conversationId: string,
    userId: string,
    role: 'member' | 'moderator' | 'admin'
  ): Promise<ConversationParticipant> {
    return this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: { role },
    })
  }

  async getParticipant(conversationId: string, userId: string): Promise<ConversationParticipant | null> {
    return this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    })
  }

  async markAsRead(conversationId: string, userId: string): Promise<ConversationParticipant> {
    return this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: { lastReadAt: new Date() },
    })
  }

  async muteConversation(conversationId: string, userId: string, isMuted: boolean): Promise<ConversationParticipant> {
    return this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: { isMuted },
    })
  }
}