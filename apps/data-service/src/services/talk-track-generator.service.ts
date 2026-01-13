/**
 * AI Talk Track Generator Service
 * Generates personalized sales conversation scripts using AI
 */

import {
  TalkTrack,
  TalkTrackType,
  TalkTrackTone,
  TalkTrackStatus,
  TalkTrackSection,
  TalkTrackTemplate,
  GenerateTalkTrackInput,
  GeneratedTalkTrack,
  GenerationMetadata,
  LeadContext,
  CompetitorContext,
  ObjectionHandler,
  ObjectionType,
  GenerateObjectionHandlersInput,
  TalkTrackUsage,
  TalkTrackAnalytics,
  TalkTrackSearchParams,
  TalkTrackSearchFilters,
  BatchGenerateTalkTracksInput,
  BatchGenerationJob,
  TalkTrackFavorite,
  TalkTrackCustomization,
  UsageContext,
  UsageFeedback,
  SalesStage,
} from '@insure/types';

interface AIService {
  generateCompletion(prompt: string, options?: any): Promise<{
    content: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTime: number;
  }>;
}

interface PrismaClient {
  talkTrack: {
    create: (data: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    count: (args?: any) => Promise<number>;
  };
  talkTrackSection: {
    create: (data: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
  objectionHandler: {
    create: (data: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
  talkTrackUsage: {
    create: (data: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
  };
  talkTrackFavorite: {
    create: (data: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
  talkTrackCustomization: {
    create: (data: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
}

export class TalkTrackGeneratorService {
  private prisma: PrismaClient;
  private aiService: AIService;

  constructor(prisma: any, aiService: any) {
    this.prisma = prisma;
    this.aiService = aiService;
  }

  // ========================================
  // Talk Track Generation
  // ========================================

  async generateTalkTrack(input: GenerateTalkTrackInput): Promise<GeneratedTalkTrack> {
    const startTime = Date.now();

    // Build generation prompt
    const prompt = await this.buildGenerationPrompt(input);

    // Generate content using AI
    const aiResponse = await this.aiService.generateCompletion(prompt, {
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Parse AI response into talk track structure
    const talkTrack = await this.parseGeneratedContent(
      aiResponse.content,
      input,
      aiResponse
    );

    // Save to database
    const savedTalkTrack = await this.prisma.talkTrack.create({
      data: {
        organizationId: input.organizationId,
        name: this.generateTalkTrackName(input),
        type: input.type,
        tone: input.tone || TalkTrackTone.PROFESSIONAL,
        status: TalkTrackStatus.DRAFT,
        targetAudience: input.targetAudience,
        industry: input.industry ? [input.industry] : [],
        productFocus: input.productFocus,
        estimatedDuration: input.maxDuration,
        tags: this.generateTags(input),
        sections: {
          create: talkTrack.sections,
        },
        createdBy: 'system', // AI generated
        version: 1,
        isTemplate: false,
        usageCount: 0,
      },
      include: { sections: true },
    });

    const metadata: GenerationMetadata = {
      model: aiResponse.model,
      generatedAt: new Date(),
      promptTokens: aiResponse.promptTokens,
      completionTokens: aiResponse.completionTokens,
      totalTime: Date.now() - startTime,
      sources: this.identifySources(input),
      customizations: this.identifyCustomizations(input),
    };

    // Calculate confidence based on context completeness
    const confidence = this.calculateConfidence(input);

    return {
      talkTrack: savedTalkTrack as TalkTrack,
      metadata,
      confidence,
    };
  }

  private async buildGenerationPrompt(input: GenerateTalkTrackInput): Promise<string> {
    const {
      type,
      tone,
      targetAudience,
      industry,
      productFocus,
      leadContext,
      competitorContext,
      customInstructions,
      sections,
      excludeSections,
      maxDuration,
    } = input;

    let prompt = `You are an expert sales coach. Generate a sales talk track for a ${type} conversation.\n\n`;

    // Add context
    if (tone) {
      prompt += `Tone: ${tone}\n`;
    }

    if (targetAudience && targetAudience.length > 0) {
      prompt += `Target Audience: ${targetAudience.join(', ')}\n`;
    }

    if (industry) {
      prompt += `Industry: ${industry}\n`;
    }

    if (productFocus && productFocus.length > 0) {
      prompt += `Product/Service Focus: ${productFocus.join(', ')}\n`;
    }

    // Add lead context if available
    if (leadContext) {
      prompt += '\nLead Context:\n';
      if (leadContext.company) prompt += `- Company: ${leadContext.company}\n`;
      if (leadContext.industry) prompt += `- Industry: ${leadContext.industry}\n`;
      if (leadContext.size) prompt += `- Company Size: ${leadContext.size}\n`;
      if (leadContext.painPoints && leadContext.painPoints.length > 0) {
        prompt += `- Pain Points: ${leadContext.painPoints.join(', ')}\n`;
      }
      if (leadContext.budgetRange) prompt += `- Budget Range: ${leadContext.budgetRange}\n`;
      if (leadContext.timeline) prompt += `- Timeline: ${leadContext.timeline}\n`;
      if (leadContext.source) prompt += `- Lead Source: ${leadContext.source}\n`;
    }

    // Add competitor context if available
    if (competitorContext) {
      prompt += '\nCompetitor Context:\n';
      if (competitorContext.competitorName) {
        prompt += `- Competing Against: ${competitorContext.competitorName}\n`;
      }
      if (competitorContext.competitorStrengths && competitorContext.competitorStrengths.length > 0) {
        prompt += `- Their Strengths: ${competitorContext.competitorStrengths.join(', ')}\n`;
      }
      if (competitorContext.competitorWeaknesses && competitorContext.competitorWeaknesses.length > 0) {
        prompt += `- Their Weaknesses: ${competitorContext.competitorWeaknesses.join(', ')}\n`;
      }
      if (competitorContext.knownObjections && competitorContext.knownObjections.length > 0) {
        prompt += `- Known Objections: ${competitorContext.knownObjections.join(', ')}\n`;
      }
    }

    // Duration constraints
    if (maxDuration) {
      prompt += `\nEstimated Duration: Keep to approximately ${maxDuration} minutes\n`;
    }

    // Custom instructions
    if (customInstructions) {
      prompt += `\nCustom Instructions: ${customInstructions}\n`;
    }

    // Section specifications
    if (sections && sections.length > 0) {
      prompt += `\nInclude these sections: ${sections.join(', ')}\n`;
    }

    if (excludeSections && excludeSections.length > 0) {
      prompt += `\nExclude these sections: ${excludeSections.join(', ')}\n`;
    }

    prompt += `\nGenerate the talk track in the following JSON format:
{
  "name": "Talk track name",
  "sections": [
    {
      "title": "Section title",
      "content": "Actual script content for this section",
      "tips": ["Tip 1", "Tip 2"],
      "keyPoints": ["Key point 1", "Key point 2"],
      "order": 1
    }
  ]
}

Focus on providing actionable, conversational scripts that sales agents can use directly. Include specific phrases and questions.`;

    return prompt;
  }

  private async parseGeneratedContent(
    content: string,
    input: GenerateTalkTrackInput,
    aiResponse: any
  ): Promise<{ sections: any[] }> {
    try {
      // Extract JSON from content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? JSON.parse(jsonMatch[0]) : { sections: [] };

      // Ensure sections have required fields
      const sections = jsonContent.sections.map((section: any, index: number) => ({
        title: section.title || `Section ${index + 1}`,
        content: section.content || '',
        tips: section.tips || [],
        keyPoints: section.keyPoints || [],
        order: section.order || index + 1,
        requiredFields: this.identifyRequiredFields(section.content),
      }));

      return { sections };
    } catch (error) {
      console.error('Failed to parse generated content:', error);
      // Fallback: create basic structure
      return {
        sections: [
          {
            title: 'Introduction',
            content: content.substring(0, 500),
            tips: [],
            keyPoints: [],
            order: 1,
            requiredFields: [],
          },
        ],
      };
    }
  }

  private generateTalkTrackName(input: GenerateTalkTrackInput): string {
    const parts = [input.type];

    if (input.leadContext?.company) {
      parts.push(`for ${input.leadContext.company}`);
    }

    if (input.industry) {
      parts.push(`- ${input.industry}`);
    }

    return parts.join(' ');
  }

  private generateTags(input: GenerateTalkTrackInput): string[] {
    const tags = [input.type.toLowerCase()];

    if (input.tone) {
      tags.push(input.tone.toLowerCase());
    }

    if (input.industry) {
      tags.push(input.industry.toLowerCase());
    }

    if (input.targetAudience) {
      tags.push(...input.targetAudience.map(a => a.toLowerCase()));
    }

    if (input.leadContext?.stage) {
      tags.push(input.leadContext.stage.toLowerCase());
    }

    return tags;
  }

  private identifySources(input: GenerateTalkTrackInput): string[] {
    const sources: string[] = ['ai_generation'];

    if (input.leadContext) {
      sources.push('lead_context');
    }

    if (input.competitorContext) {
      sources.push('competitive_intelligence');
    }

    if (input.customInstructions) {
      sources.push('custom_instructions');
    }

    return sources;
  }

  private identifyCustomizations(input: GenerateTalkTrackInput): string[] {
    const customizations: string[] = [];

    if (input.tone) {
      customizations.push(`tone_${input.tone.toLowerCase()}`);
    }

    if (input.leadContext?.company) {
      customizations.push('company_specific');
    }

    if (input.leadContext?.painPoints?.length) {
      customizations.push('pain_point_addressed');
    }

    if (input.competitorContext?.competitorName) {
      customizations.push('competitive_positioning');
    }

    return customizations;
  }

  private calculateConfidence(input: GenerateTalkTrackInput): number {
    let score = 0.5; // Base confidence

    // Increase confidence with more context
    if (input.leadContext) score += 0.1;
    if (input.leadContext?.company) score += 0.1;
    if (input.leadContext?.painPoints?.length) score += 0.1;
    if (input.competitorContext) score += 0.1;
    if (input.customInstructions) score += 0.05;
    if (input.industry) score += 0.05;

    return Math.min(score, 1);
  }

  private identifyRequiredFields(content: string): string[] {
    const fields: string[] = [];

    const fieldPatterns = [
      { pattern: /\{company\}/gi, field: 'company' },
      { pattern: /\{name\}/gi, field: 'leadName' },
      { pattern: /\{industry\}/gi, field: 'industry' },
      { pattern: /\{budget\}/gi, field: 'budgetRange' },
      { pattern: /\{timeline\}/gi, field: 'timeline' },
      { pattern: /\{pain_points\}/gi, field: 'painPoints' },
    ];

    fieldPatterns.forEach(({ pattern, field }) => {
      if (pattern.test(content)) {
        fields.push(field);
      }
    });

    return fields;
  }

  // ========================================
  // Objection Handler Generation
  // ========================================

  async generateObjectionHandlers(
    input: GenerateObjectionHandlersInput
  ): Promise<ObjectionHandler[]> {
    const prompt = this.buildObjectionPrompt(input);

    const aiResponse = await this.aiService.generateCompletion(prompt, {
      temperature: 0.8,
      maxTokens: 1000,
    });

    const handlers = this.parseObjectionHandlers(aiResponse.content, input);

    // Save handlers
    const savedHandlers = await Promise.all(
      handlers.map(handler =>
        this.prisma.objectionHandler.create({
          data: {
            ...handler,
            confidence: this.calculateObjectionConfidence(handler),
          },
        })
      )
    );

    return savedHandlers as ObjectionHandler[];
  }

  private buildObjectionPrompt(input: GenerateObjectionHandlersInput): string {
    let prompt = `You are an expert sales coach. Generate objection handling strategies for the "${input.objectionType}" objection.\n\n`;

    if (input.customObjection) {
      prompt += `Specific Objection: "${input.customObjection}"\n\n`;
    }

    if (input.context?.industry) {
      prompt += `Industry Context: ${input.context.industry}\n`;
    }

    if (input.context?.productFocus?.length) {
      prompt += `Product Focus: ${input.context.productFocus.join(', ')}\n`;
    }

    if (input.context?.competitor) {
      prompt += `Competitor Context: Addressing ${input.context.competitor}\n`;
    }

    if (input.tone) {
      prompt += `Tone: ${input.tone}\n`;
    }

    prompt += `\nGenerate 3 different response variations using different techniques (e.g., Feel-Felt-Found, Reframe, Clarify, Pivot, etc.).\n\n`;
    prompt += `Format as JSON:
{
  "handlers": [
    {
      "objection": "The objection text or pattern",
      "response": "Your response to the objection",
      "techniques": ["technique1", "technique2"],
      "fallbackResponses": ["Alternative 1", "Alternative 2"]
    }
  ]
}`;

    return prompt;
  }

  private parseObjectionHandlers(content: string, input: GenerateObjectionHandlersInput): any[] {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? JSON.parse(jsonMatch[0]) : { handlers: [] };

      return jsonContent.handlers.map((handler: any) => ({
        objectionType: input.objectionType,
        objection: handler.objection || input.customObjection || input.objectionType,
        response: handler.response || '',
        techniques: handler.techniques || [],
        fallbackResponses: handler.fallbackResponses || [],
      }));
    } catch (error) {
      console.error('Failed to parse objection handlers:', error);
      return [];
    }
  }

  private calculateObjectionConfidence(handler: any): number {
    // Higher confidence for handlers with multiple techniques
    const techniqueBonus = Math.min(handler.techniques?.length * 0.1, 0.3);
    const fallbackBonus = Math.min(handler.fallbackResponses?.length * 0.05, 0.15);
    return Math.min(0.5 + techniqueBonus + fallbackBonus, 1);
  }

  // ========================================
  // Talk Track CRUD
  // ========================================

  async getTalkTrack(id: string): Promise<TalkTrack | null> {
    const talkTrack = await this.prisma.talkTrack.findUnique({
      where: { id },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    return talkTrack as TalkTrack | null;
  }

  async listTalkTracks(params: TalkTrackSearchParams): Promise<{
    talkTracks: TalkTrack[];
    total: number;
  }> {
    const { organizationId, filters, searchTerm, sortBy, sortOrder, page, limit } = params;
    const where: any = { organizationId };

    if (filters) {
      if (filters.type) where.type = filters.type;
      if (filters.tone) where.tone = filters.tone;
      if (filters.status) where.status = filters.status;
      if (filters.isTemplate !== undefined) where.isTemplate = filters.isTemplate;
      if (filters.industry?.length) where.industry = { hasSome: filters.industry };
      if (filters.tags?.length) where.tags = { hasSome: filters.tags };
      if (filters.dateRange) {
        where.createdAt = {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end,
        };
      }
      if (filters.createdBy) where.createdBy = filters.createdBy;
    }

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { hasSome: [searchTerm] } },
      ];
    }

    const orderBy: any = {};
    orderBy[sortBy || 'createdAt'] = sortOrder || 'desc';

    const [talkTracks, total] = await Promise.all([
      this.prisma.talkTrack.findMany({
        where,
        orderBy,
        include: { sections: { orderBy: { order: 'asc' } } },
        take: limit || 50,
        skip: ((page || 1) - 1) * (limit || 50),
      }),
      this.prisma.talkTrack.count({ where }),
    ]);

    return { talkTracks: talkTracks as TalkTrack[], total };
  }

  async updateTalkTrack(id: string, updates: Partial<TalkTrack>): Promise<TalkTrack> {
    const talkTrack = await this.prisma.talkTrack.update({
      where: { id },
      data: {
        ...updates,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
      include: { sections: true },
    });
    return talkTrack as TalkTrack;
  }

  async deleteTalkTrack(id: string): Promise<void> {
    await this.prisma.talkTrack.delete({ where: { id } });
  }

  async approveTalkTrack(id: string): Promise<TalkTrack> {
    return this.updateTalkTrack(id, { status: TalkTrackStatus.APPROVED });
  }

  async archiveTalkTrack(id: string): Promise<TalkTrack> {
    return this.updateTalkTrack(id, { status: TalkTrackStatus.ARCHIVED });
  }

  // ========================================
  // Talk Track Templates
  // ========================================

  async createTemplate(template: TalkTrackTemplate, organizationId: string): Promise<TalkTrack> {
    const talkTrack = await this.prisma.talkTrack.create({
      data: {
        organizationId,
        name: template.name,
        type: template.type,
        tone: template.tone,
        status: TalkTrackStatus.APPROVED,
        targetAudience: template.targetAudience,
        industry: template.industry,
        estimatedDuration: template.estimatedDuration,
        tags: template.tags,
        sections: {
          create: template.sections.map(section => ({
            title: section.title,
            order: section.order,
            content: section.content,
            tips: section.tips,
            keyPoints: section.keyPoints,
            requiredFields: section.requiredFields,
          })),
        },
        createdBy: 'system',
        version: 1,
        isTemplate: true,
        usageCount: 0,
      },
      include: { sections: true },
    });

    return talkTrack as TalkTrack;
  }

  async getTemplates(organizationId: string): Promise<TalkTrack[]> {
    const templates = await this.prisma.talkTrack.findMany({
      where: { organizationId, isTemplate: true },
      include: { sections: { orderBy: { order: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    return templates as TalkTrack[];
  }

  // ========================================
  // Usage Tracking
  // ========================================

  async trackUsage(
    talkTrackId: string,
    agentId: string,
    context: UsageContext,
    feedback?: UsageFeedback
  ): Promise<TalkTrackUsage> {
    const usage = await this.prisma.talkTrackUsage.create({
      data: {
        talkTrackId,
        agentId,
        context,
        feedback,
        usedAt: new Date(),
      },
    });

    // Increment usage count
    await this.prisma.talkTrack.update({
      where: { id: talkTrackId },
      data: { usageCount: { increment: 1 } },
    });

    return usage as TalkTrackUsage;
  }

  async getUsageAnalytics(talkTrackId: string): Promise<TalkTrackAnalytics> {
    const usages = await this.prisma.talkTrackUsage.findMany({
      where: { talkTrackId },
    });

    const analytics: TalkTrackAnalytics = {
      talkTrackId,
      totalUsage: usages.length,
      avgRating: this.calculateAverageRating(usages),
      successRate: this.calculateSuccessRate(usages),
      avgDuration: this.calculateAverageDuration(usages),
      mostUsedSections: this.getMostUsedSections(usages),
      leastUsedSections: this.getLeastUsedSections(usages),
      feedbackTrends: this.getFeedbackTrends(usages),
      topObjections: this.getTopObjections(usages),
    };

    return analytics;
  }

  private calculateAverageRating(usages: any[]): number {
    const ratedUsages = usages.filter(u => u.feedback?.rating);
    if (ratedUsages.length === 0) return 0;
    const sum = ratedUsages.reduce((acc, u) => acc + (u.feedback?.rating || 0), 0);
    return sum / ratedUsages.length;
  }

  private calculateSuccessRate(usages: any[]): number {
    const successful = usages.filter(u =>
      ['scheduled', 'closed'].includes(u.context?.outcome)
    ).length;
    return usages.length > 0 ? successful / usages.length : 0;
  }

  private calculateAverageDuration(usages: any[]): number {
    const withDuration = usages.filter(u => u.context?.duration);
    if (withDuration.length === 0) return 0;
    const sum = withDuration.reduce((acc, u) => acc + (u.context?.duration || 0), 0);
    return sum / withDuration.length;
  }

  private getMostUsedSections(usages: any[]): string[] {
    const sectionCounts: Record<string, number> = {};
    usages.forEach(u => {
      u.context?.sectionsUsed?.forEach((section: string) => {
        sectionCounts[section] = (sectionCounts[section] || 0) + 1;
      });
    });
    return Object.entries(sectionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([section]) => section);
  }

  private getLeastUsedSections(usages: any[]): string[] {
    const sectionCounts: Record<string, number> = {};
    usages.forEach(u => {
      u.context?.sectionsUsed?.forEach((section: string) => {
        sectionCounts[section] = (sectionCounts[section] || 0) + 1;
      });
    });
    return Object.entries(sectionCounts)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([section]) => section);
  }

  private getFeedbackTrends(usages: any[]): any[] {
    // Group by date and calculate daily averages
    const byDate: Record<string, any[]> = {};
    usages.forEach(u => {
      const date = u.usedAt.toISOString().split('T')[0];
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(u);
    });

    return Object.entries(byDate)
      .slice(-7) // Last 7 days
      .map(([date, dailyUsages]) => ({
        date: new Date(date),
        avgRating: this.calculateAverageRating(dailyUsages),
        usageCount: dailyUsages.length,
      }));
  }

  private getTopObjections(usages: any[]): any[] {
    // This would need more detailed objection tracking
    return [];
  }

  // ========================================
  // Favorites and Customization
  // ========================================

  async addToFavorites(talkTrackId: string, agentId: string, notes?: string): Promise<TalkTrackFavorite> {
    return this.prisma.talkTrackFavorite.create({
      data: {
        talkTrackId,
        agentId,
        notes,
        addedAt: new Date(),
      },
    });
  }

  async getFavorites(agentId: string): Promise<TalkTrackFavorite[]> {
    return this.prisma.talkTrackFavorite.findMany({
      where: { agentId },
      orderBy: { addedAt: 'desc' },
    });
  }

  async removeFromFavorites(talkTrackId: string, agentId: string): Promise<void> {
    await this.prisma.talkTrackFavorite.deleteMany({
      where: { talkTrackId, agentId },
    });
  }

  async createCustomization(
    talkTrackId: string,
    agentId: string,
    customizations: any[]
  ): Promise<TalkTrackCustomization> {
    return this.prisma.talkTrackCustomization.create({
      data: {
        talkTrackId,
        agentId,
        customizations,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async getAgentCustomizations(agentId: string): Promise<TalkTrackCustomization[]> {
    return this.prisma.talkTrackCustomization.findMany({
      where: { agentId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ========================================
  // Batch Generation
  // ========================================

  async batchGenerateTalkTracks(
    input: BatchGenerateTalkTracksInput
  ): Promise<BatchGenerationJob> {
    const job = await this.prisma.talkTrack.create({
      data: {
        organizationId: input.organizationId,
        // Store batch job metadata in a separate table in production
        // For now, we'll process synchronously
      },
    });

    const results: GeneratedTalkTrack[] = [];
    const errors: any[] = [];

    for (let i = 0; i < input.inputs.length; i++) {
      try {
        const result = await this.generateTalkTrack(input.inputs[i]);
        results.push(result);
      } catch (error) {
        errors.push({
          inputIndex: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      id: job.id,
      organizationId: input.organizationId,
      status: 'completed',
      total: input.inputs.length,
      completed: results.length,
      failed: errors.length,
      results,
      errors,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }
}
