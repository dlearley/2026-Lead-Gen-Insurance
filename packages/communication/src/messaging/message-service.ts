// Message Service - Handle message CRUD operations

import { PrismaClient } from '@prisma/client'
import { Message, SendMessageInput, UpdateMessageInput, AddReactionInput } from './types.js'

export class MessageService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    const { conversationId, authorId, content, contentType = 'text', threadId, mentions = [], attachments = [] } = input

    return this.prisma.$transaction(async (tx) => {
      // Create message
      const message = await tx.message.create({
        data: {
          conversationId,
          authorId,
          content,
          contentType,
          threadId,
          mentions,
        },
      })

      // Create attachments
      if (attachments.length > 0) {
        await tx.messageAttachment.createMany({
          data: attachments.map((attachment) => ({
            messageId: message.id,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            fileSize: attachment.fileSize,
            mimeType: attachment.mimeType,
          })),
        })
      }

      // Update conversation last message time
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      })

      return message
    })
  }

  async getMessage(messageId: string): Promise<Message | null> {
    return this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        reactions: true,
        attachments: true,
      },
    })
  }

  async getMessageHistory(conversationId: string, limit: number = 50, cursor?: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      include: {
        reactions: true,
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
    })
  }

  async getThreadMessages(threadId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { threadId },
      include: {
        reactions: true,
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async updateMessage(input: UpdateMessageInput): Promise<Message> {
    const { messageId, content } = input

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        editedAt: new Date(),
      },
    })
  }

  async deleteMessage(messageId: string): Promise<Message> {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    })
  }

  async addReaction(input: AddReactionInput): Promise<void> {
    const { messageId, userId, emoji } = input

    // Check if reaction already exists
    const existingReaction = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    })

    if (existingReaction) {
      // Remove reaction if it already exists (toggle behavior)
      await this.prisma.messageReaction.delete({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji,
          },
        },
      })
    } else {
      // Add new reaction
      await this.prisma.messageReaction.create({
        data: {
          messageId,
          userId,
          emoji,
        },
      })
    }
  }

  async pinMessage(messageId: string, isPinned: boolean): Promise<Message> {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { isPinned },
    })
  }

  async searchMessages(
    organizationId: string,
    query: string,
    limit: number = 20
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: {
        conversation: {
          organizationId,
        },
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        reactions: true,
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    })

    if (!participant || !participant.lastReadAt) {
      return this.prisma.message.count({
        where: { conversationId },
      })
    }

    return this.prisma.message.count({
      where: {
        conversationId,
        createdAt: { gt: participant.lastReadAt },
      },
    })
  }
}