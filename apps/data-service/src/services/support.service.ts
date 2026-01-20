import {
  SupportTicket,
  Incident,
  KnowledgeBaseArticle,
  SLAPolicy,
  SLAReport,
  SupportAnalytics,
  AgentPerformanceReport,
  CreateTicketDto,
  UpdateTicketDto,
  CreateIncidentDto,
  UpdateIncidentDto,
  CreateKBArticleDto,
  UpdateKBArticleDto,
  CreateSLAPolicyDto,
  UpdateSLAPolicyDto,
  TicketFilterParams,
  IncidentFilterParams,
  KBArticleFilterParams,
  TicketComment,
  TicketUpdate,
  IncidentTimelineEntry,
  IncidentUpdate,
  EscalationHistory,
  TicketPriority,
  TicketStatus,
  IncidentStatus,
  IncidentSeverity,
  SLAMetric,
} from '@insurance/types';

export class SupportService {
  private tickets: Map<string, SupportTicket> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private kbArticles: Map<string, KnowledgeBaseArticle> = new Map();
  private slaPolicies: Map<string, SLAPolicy> = new Map();
  private ticketComments: Map<string, TicketComment[]> = new Map();
  private ticketUpdates: Map<string, TicketUpdate[]> = new Map();
  private incidentTimeline: Map<string, IncidentTimelineEntry[]> = new Map();
  private incidentUpdates: Map<string, IncidentUpdate[]> = new Map();
  private escalationHistory: Map<string, EscalationHistory[]> = new Map();

  // ============ SUPPORT TICKET MANAGEMENT ============

  async createTicket(data: CreateTicketDto, createdBy: string): Promise<SupportTicket> {
    const ticketNumber = this.generateTicketNumber();
    const now = new Date();

    // Find applicable SLA policy
    const slaPolicy = await this.findApplicableSLAPolicy(data.priority);
    
    const ticket: SupportTicket = {
      id: this.generateId(),
      ticketNumber,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: 'OPEN',
      category: data.category,
      channel: data.channel || 'WEB_FORM',
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      createdBy,
      tags: data.tags || [],
      affectedSystems: data.affectedSystems || [],
      slaId: slaPolicy?.id,
      responseDeadline: slaPolicy ? this.calculateDeadline(now, slaPolicy.responseTimeTarget) : undefined,
      resolutionDeadline: slaPolicy ? this.calculateDeadline(now, slaPolicy.resolutionTimeTarget) : undefined,
      slaBreached: false,
      escalationLevel: 0,
      relatedTickets: [],
      relatedIncidents: [],
      knowledgeBaseArticles: [],
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.tickets.set(ticket.id, ticket);
    
    // Create initial update
    await this.addTicketUpdate(ticket.id, {
      updateType: 'OTHER',
      notes: 'Ticket created',
      updatedBy: createdBy,
      updatedByName: 'System',
    });

    return ticket;
  }

  async updateTicket(id: string, data: UpdateTicketDto, updatedBy: string): Promise<SupportTicket> {
    const ticket = this.tickets.get(id);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const updates: Array<{ type: string; previous?: string; new?: string }> = [];

    // Track status changes
    if (data.status && data.status !== ticket.status) {
      updates.push({
        type: 'STATUS_CHANGE',
        previous: ticket.status,
        new: data.status,
      });

      // Check if resolved
      if (data.status === 'RESOLVED' && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
        
        // Check SLA compliance
        if (ticket.resolutionDeadline && ticket.resolvedAt > ticket.resolutionDeadline) {
          ticket.slaBreached = true;
          ticket.slaBreachReason = 'Resolution time exceeded';
        }
      }
    }

    // Track priority changes
    if (data.priority && data.priority !== ticket.priority) {
      updates.push({
        type: 'PRIORITY_CHANGE',
        previous: ticket.priority,
        new: data.priority,
      });
    }

    // Track assignment changes
    if (data.assignedTo && data.assignedTo !== ticket.assignedTo) {
      updates.push({
        type: 'ASSIGNMENT',
        previous: ticket.assignedTo || 'Unassigned',
        new: data.assignedTo,
      });

      // Record first response time
      if (!ticket.responseAt) {
        ticket.responseAt = new Date();
        
        // Check response SLA
        if (ticket.responseDeadline && ticket.responseAt > ticket.responseDeadline) {
          ticket.slaBreached = true;
          ticket.slaBreachReason = 'Response time exceeded';
        }
      }
    }

    // Update ticket fields
    Object.assign(ticket, {
      ...data,
      updatedAt: new Date(),
    });

    this.tickets.set(id, ticket);

    // Record updates
    for (const update of updates) {
      await this.addTicketUpdate(id, {
        updateType: update.type as any,
        previousValue: update.previous,
        newValue: update.new,
        updatedBy,
        updatedByName: 'User',
      });
    }

    return ticket;
  }

  async getTicket(id: string): Promise<SupportTicket | null> {
    const ticket = this.tickets.get(id);
    if (!ticket) return null;

    // Include related data
    ticket.comments = this.ticketComments.get(id) || [];
    ticket.updates = this.ticketUpdates.get(id) || [];

    return ticket;
  }

  async getTickets(filter: TicketFilterParams): Promise<{ tickets: SupportTicket[]; total: number }> {
    let tickets = Array.from(this.tickets.values());

    // Apply filters
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      tickets = tickets.filter(t => statuses.includes(t.status));
    }

    if (filter.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      tickets = tickets.filter(t => priorities.includes(t.priority));
    }

    if (filter.category) {
      const categories = Array.isArray(filter.category) ? filter.category : [filter.category];
      tickets = tickets.filter(t => categories.includes(t.category));
    }

    if (filter.assignedTo) {
      tickets = tickets.filter(t => t.assignedTo === filter.assignedTo);
    }

    if (filter.customerId) {
      tickets = tickets.filter(t => t.customerId === filter.customerId);
    }

    if (filter.slaBreached !== undefined) {
      tickets = tickets.filter(t => t.slaBreached === filter.slaBreached);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      tickets = tickets.filter(t => 
        t.title.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.ticketNumber.toLowerCase().includes(searchLower)
      );
    }

    if (filter.tags && filter.tags.length > 0) {
      tickets = tickets.filter(t => 
        filter.tags!.some(tag => t.tags.includes(tag))
      );
    }

    // Date filtering
    if (filter.dateFrom) {
      tickets = tickets.filter(t => t.createdAt >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      tickets = tickets.filter(t => t.createdAt <= filter.dateTo!);
    }

    const total = tickets.length;

    // Sorting
    const sortBy = filter.sortBy || 'createdAt';
    const sortOrder = filter.sortOrder || 'desc';
    tickets.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Pagination
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const start = (page - 1) * limit;
    const paginatedTickets = tickets.slice(start, start + limit);

    return { tickets: paginatedTickets, total };
  }

  async addTicketComment(
    ticketId: string,
    authorId: string,
    authorName: string,
    authorRole: 'CUSTOMER' | 'AGENT' | 'ADMIN' | 'SYSTEM',
    content: string,
    isInternal: boolean = false
  ): Promise<TicketComment> {
    const comment: TicketComment = {
      id: this.generateId(),
      ticketId,
      authorId,
      authorName,
      authorRole,
      content,
      isInternal,
      isSystemGenerated: authorRole === 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const comments = this.ticketComments.get(ticketId) || [];
    comments.push(comment);
    this.ticketComments.set(ticketId, comments);

    return comment;
  }

  async escalateTicket(
    ticketId: string,
    escalatedBy: string,
    escalatedTo: string,
    reason: string,
    isAutomatic: boolean = false
  ): Promise<SupportTicket> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    ticket.escalationLevel += 1;
    ticket.escalatedAt = new Date();
    ticket.escalatedTo = escalatedTo;
    ticket.escalationReason = reason;
    ticket.updatedAt = new Date();

    this.tickets.set(ticketId, ticket);

    // Record escalation
    await this.addTicketUpdate(ticketId, {
      updateType: 'ESCALATION',
      notes: `Escalated to level ${ticket.escalationLevel}: ${reason}`,
      updatedBy: escalatedBy,
      updatedByName: isAutomatic ? 'Automatic Escalation' : 'Manual Escalation',
    });

    // Record escalation history
    const history: EscalationHistory = {
      id: this.generateId(),
      ticketId,
      fromLevel: ticket.escalationLevel - 1,
      toLevel: ticket.escalationLevel,
      escalatedBy,
      escalatedByName: 'User',
      escalatedTo: [escalatedTo],
      escalationReason: reason,
      isAutomatic,
      notificationsSent: [],
      createdAt: new Date(),
    };

    const escalations = this.escalationHistory.get(ticketId) || [];
    escalations.push(history);
    this.escalationHistory.set(ticketId, escalations);

    return ticket;
  }

  // ============ INCIDENT MANAGEMENT ============

  async createIncident(data: CreateIncidentDto, reportedBy: string): Promise<Incident> {
    const incidentNumber = this.generateIncidentNumber();
    const now = new Date();

    // Get response and resolution targets based on severity
    const { responseTimeTarget, resolutionTimeTarget } = this.getIncidentSLATargets(data.severity);

    const incident: Incident = {
      id: this.generateId(),
      incidentNumber,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: 'DETECTED',
      category: data.category,
      impact: data.impact,
      affectedSystems: data.affectedSystems || [],
      affectedServices: data.affectedServices || [],
      affectedCustomers: data.affectedCustomers || 0,
      affectedAgents: data.affectedAgents || 0,
      incidentCommander: data.incidentCommander,
      assignedTeam: data.assignedTeam || [],
      reportedBy,
      detectedAt: now,
      responseTimeTarget,
      resolutionTimeTarget,
      slaBreached: false,
      customerNotificationSent: false,
      statusPageUpdated: false,
      postMortemRequired: data.severity === 'CRITICAL' || data.severity === 'HIGH',
      postMortemCompleted: false,
      tags: data.tags || [],
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
      relatedTickets: [],
    };

    this.incidents.set(incident.id, incident);

    // Add timeline entry
    await this.addIncidentTimelineEntry(incident.id, {
      eventType: 'DETECTED',
      description: 'Incident detected and created',
      performedBy: reportedBy,
      performedByName: 'System',
    });

    return incident;
  }

  async updateIncident(id: string, data: UpdateIncidentDto, updatedBy: string): Promise<Incident> {
    const incident = this.incidents.get(id);
    if (!incident) {
      throw new Error('Incident not found');
    }

    const previousStatus = incident.status;

    // Update fields
    Object.assign(incident, {
      ...data,
      updatedAt: new Date(),
    });

    // Handle status transitions
    if (data.status && data.status !== previousStatus) {
      if (data.status === 'INVESTIGATING' && !incident.acknowledgedAt) {
        incident.acknowledgedAt = new Date();
        incident.responseTimeActual = this.calculateMinutesDiff(incident.detectedAt, incident.acknowledgedAt);
        
        if (incident.responseTimeActual > incident.responseTimeTarget) {
          incident.slaBreached = true;
        }
      }

      if (data.status === 'MONITORING' && !incident.mitigatedAt) {
        incident.mitigatedAt = new Date();
      }

      if (data.status === 'RESOLVED' && !incident.resolvedAt) {
        incident.resolvedAt = new Date();
        incident.resolutionTimeActual = this.calculateMinutesDiff(incident.detectedAt, incident.resolvedAt);
        
        if (incident.resolutionTimeActual > incident.resolutionTimeTarget) {
          incident.slaBreached = true;
        }
      }

      // Add timeline entry
      await this.addIncidentTimelineEntry(id, {
        eventType: 'UPDATE',
        description: `Status changed from ${previousStatus} to ${data.status}`,
        performedBy: updatedBy,
        performedByName: 'User',
      });
    }

    this.incidents.set(id, incident);
    return incident;
  }

  async getIncident(id: string): Promise<Incident | null> {
    const incident = this.incidents.get(id);
    if (!incident) return null;

    // Include related data
    incident.timeline = this.incidentTimeline.get(id) || [];
    incident.updates = this.incidentUpdates.get(id) || [];

    return incident;
  }

  async getIncidents(filter: IncidentFilterParams): Promise<{ incidents: Incident[]; total: number }> {
    let incidents = Array.from(this.incidents.values());

    // Apply filters
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      incidents = incidents.filter(i => statuses.includes(i.status));
    }

    if (filter.severity) {
      const severities = Array.isArray(filter.severity) ? filter.severity : [filter.severity];
      incidents = incidents.filter(i => severities.includes(i.severity));
    }

    if (filter.category) {
      const categories = Array.isArray(filter.category) ? filter.category : [filter.category];
      incidents = incidents.filter(i => categories.includes(i.category));
    }

    if (filter.incidentCommander) {
      incidents = incidents.filter(i => i.incidentCommander === filter.incidentCommander);
    }

    if (filter.slaBreached !== undefined) {
      incidents = incidents.filter(i => i.slaBreached === filter.slaBreached);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      incidents = incidents.filter(i => 
        i.title.toLowerCase().includes(searchLower) ||
        i.description.toLowerCase().includes(searchLower) ||
        i.incidentNumber.toLowerCase().includes(searchLower)
      );
    }

    if (filter.dateFrom) {
      incidents = incidents.filter(i => i.detectedAt >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      incidents = incidents.filter(i => i.detectedAt <= filter.dateTo!);
    }

    const total = incidents.length;

    // Sorting
    const sortBy = filter.sortBy || 'detectedAt';
    const sortOrder = filter.sortOrder || 'desc';
    incidents.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Pagination
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const start = (page - 1) * limit;
    const paginatedIncidents = incidents.slice(start, start + limit);

    return { incidents: paginatedIncidents, total };
  }

  async addIncidentUpdate(
    incidentId: string,
    updateType: 'STATUS' | 'INVESTIGATION' | 'MITIGATION' | 'RESOLUTION' | 'GENERAL',
    title: string,
    description: string,
    isPublic: boolean,
    createdBy: string
  ): Promise<IncidentUpdate> {
    const update: IncidentUpdate = {
      id: this.generateId(),
      incidentId,
      updateType,
      title,
      description,
      isPublic,
      createdBy,
      createdByName: 'User',
      createdAt: new Date(),
    };

    const updates = this.incidentUpdates.get(incidentId) || [];
    updates.push(update);
    this.incidentUpdates.set(incidentId, updates);

    return update;
  }

  // ============ KNOWLEDGE BASE ============

  async createKBArticle(data: CreateKBArticleDto, author: string): Promise<KnowledgeBaseArticle> {
    const articleNumber = this.generateKBArticleNumber();

    const article: KnowledgeBaseArticle = {
      id: this.generateId(),
      articleNumber,
      title: data.title,
      summary: data.summary,
      content: data.content,
      category: data.category,
      status: 'DRAFT',
      tags: data.tags || [],
      keywords: data.keywords || [],
      relatedArticles: data.relatedArticles || [],
      relatedTickets: [],
      relatedIncidents: [],
      views: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      rating: 0,
      ratingCount: 0,
      author,
      searchBoost: 1.0,
      isPinned: false,
      isInternal: data.isInternal || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.kbArticles.set(article.id, article);
    return article;
  }

  async updateKBArticle(id: string, data: UpdateKBArticleDto, updatedBy: string): Promise<KnowledgeBaseArticle> {
    const article = this.kbArticles.get(id);
    if (!article) {
      throw new Error('KB Article not found');
    }

    // Handle publishing
    if (data.status === 'PUBLISHED' && article.status !== 'PUBLISHED') {
      article.publishedAt = new Date();
    }

    // Handle archiving
    if (data.status === 'ARCHIVED' && article.status !== 'ARCHIVED') {
      article.archivedAt = new Date();
    }

    Object.assign(article, {
      ...data,
      lastModifiedBy: updatedBy,
      updatedAt: new Date(),
    });

    this.kbArticles.set(id, article);
    return article;
  }

  async getKBArticle(id: string): Promise<KnowledgeBaseArticle | null> {
    const article = this.kbArticles.get(id);
    if (!article) return null;

    // Increment view count
    article.views += 1;
    this.kbArticles.set(id, article);

    return article;
  }

  async searchKBArticles(filter: KBArticleFilterParams): Promise<{ articles: KnowledgeBaseArticle[]; total: number }> {
    let articles = Array.from(this.kbArticles.values());

    // Apply filters
    if (filter.status) {
      articles = articles.filter(a => a.status === filter.status);
    }

    if (filter.category) {
      const categories = Array.isArray(filter.category) ? filter.category : [filter.category];
      articles = articles.filter(a => categories.includes(a.category));
    }

    if (filter.author) {
      articles = articles.filter(a => a.author === filter.author);
    }

    if (filter.isInternal !== undefined) {
      articles = articles.filter(a => a.isInternal === filter.isInternal);
    }

    if (filter.isPinned !== undefined) {
      articles = articles.filter(a => a.isPinned === filter.isPinned);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      articles = articles.filter(a => 
        a.title.toLowerCase().includes(searchLower) ||
        a.summary.toLowerCase().includes(searchLower) ||
        a.content.toLowerCase().includes(searchLower) ||
        a.keywords.some(k => k.toLowerCase().includes(searchLower))
      );
    }

    if (filter.tags && filter.tags.length > 0) {
      articles = articles.filter(a => 
        filter.tags!.some(tag => a.tags.includes(tag))
      );
    }

    const total = articles.length;

    // Sorting (prioritize pinned, then by boost and rating)
    articles.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      
      const scoreA = a.searchBoost * (a.rating || 0);
      const scoreB = b.searchBoost * (b.rating || 0);
      return scoreB - scoreA;
    });

    // Pagination
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const start = (page - 1) * limit;
    const paginatedArticles = articles.slice(start, start + limit);

    return { articles: paginatedArticles, total };
  }

  // ============ SLA MANAGEMENT ============

  async createSLAPolicy(data: CreateSLAPolicyDto): Promise<SLAPolicy> {
    const policy: SLAPolicy = {
      id: this.generateId(),
      name: data.name,
      description: data.description,
      isActive: true,
      priority: data.priority,
      customerTier: data.customerTier,
      responseTimeTarget: data.responseTimeTarget,
      responseTimeWarningThreshold: data.responseTimeWarningThreshold || 80,
      resolutionTimeTarget: data.resolutionTimeTarget,
      resolutionTimeWarningThreshold: data.resolutionTimeWarningThreshold || 80,
      applyBusinessHoursOnly: data.applyBusinessHoursOnly || false,
      businessHoursStart: data.businessHoursStart || '09:00',
      businessHoursEnd: data.businessHoursEnd || '17:00',
      businessDays: data.businessDays || [1, 2, 3, 4, 5], // Mon-Fri
      timezone: data.timezone || 'UTC',
      autoEscalateOnBreach: data.autoEscalateOnBreach || false,
      escalationChain: data.escalationChain || [],
      notifyOnWarning: data.notifyOnWarning || true,
      notifyOnBreach: data.notifyOnBreach || true,
      notificationEmails: data.notificationEmails || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.slaPolicies.set(policy.id, policy);
    return policy;
  }

  async getSLAPolicies(): Promise<SLAPolicy[]> {
    return Array.from(this.slaPolicies.values());
  }

  async getSLAReport(startDate: Date, endDate: Date): Promise<SLAReport> {
    const tickets = Array.from(this.tickets.values()).filter(
      t => t.createdAt >= startDate && t.createdAt <= endDate
    );

    const totalTickets = tickets.length;
    const ticketsMetSLA = tickets.filter(t => !t.slaBreached).length;
    const ticketsBreachedSLA = totalTickets - ticketsMetSLA;
    const complianceRate = totalTickets > 0 ? (ticketsMetSLA / totalTickets) * 100 : 0;

    // Calculate average times
    const resolvedTickets = tickets.filter(t => t.resolvedAt);
    const avgResponseTime = this.calculateAverageTime(
      tickets.filter(t => t.responseAt),
      (t) => this.calculateMinutesDiff(t.createdAt, t.responseAt!)
    );
    const avgResolutionTime = this.calculateAverageTime(
      resolvedTickets,
      (t) => this.calculateMinutesDiff(t.createdAt, t.resolvedAt!)
    );

    // By priority
    const byPriority: any = {};
    const priorities: TicketPriority[] = ['P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW'];
    
    for (const priority of priorities) {
      const priorityTickets = tickets.filter(t => t.priority === priority);
      const priorityMet = priorityTickets.filter(t => !t.slaBreached).length;
      
      byPriority[priority] = {
        totalTickets: priorityTickets.length,
        metSLA: priorityMet,
        breachedSLA: priorityTickets.length - priorityMet,
        complianceRate: priorityTickets.length > 0 ? (priorityMet / priorityTickets.length) * 100 : 0,
        avgResponseTime: this.calculateAverageTime(
          priorityTickets.filter(t => t.responseAt),
          (t) => this.calculateMinutesDiff(t.createdAt, t.responseAt!)
        ),
        avgResolutionTime: this.calculateAverageTime(
          priorityTickets.filter(t => t.resolvedAt),
          (t) => this.calculateMinutesDiff(t.createdAt, t.resolvedAt!)
        ),
      };
    }

    // By category
    const byCategory: any = {};
    tickets.forEach(t => {
      if (!byCategory[t.category]) {
        byCategory[t.category] = { totalTickets: 0, complianceRate: 0 };
      }
      byCategory[t.category].totalTickets += 1;
    });

    Object.keys(byCategory).forEach(category => {
      const categoryTickets = tickets.filter(t => t.category === category);
      const met = categoryTickets.filter(t => !t.slaBreached).length;
      byCategory[category].complianceRate = (met / categoryTickets.length) * 100;
    });

    // Top breaches
    const breachedTickets = tickets
      .filter(t => t.slaBreached && t.resolvedAt)
      .map(t => ({
        ticketId: t.id,
        ticketNumber: t.ticketNumber,
        breachDuration: t.resolutionDeadline 
          ? this.calculateMinutesDiff(t.resolutionDeadline, t.resolvedAt!)
          : 0,
        priority: t.priority,
      }))
      .sort((a, b) => b.breachDuration - a.breachDuration)
      .slice(0, 10);

    return {
      period: { startDate, endDate },
      overallMetrics: {
        totalTickets,
        ticketsMetSLA,
        ticketsBreachedSLA,
        complianceRate,
        averageResponseTime: avgResponseTime,
        averageResolutionTime: avgResolutionTime,
      },
      byPriority,
      byCategory,
      topBreaches: breachedTickets,
    };
  }

  // ============ ANALYTICS ============

  async getSupportAnalytics(startDate: Date, endDate: Date): Promise<SupportAnalytics> {
    const tickets = Array.from(this.tickets.values()).filter(
      t => t.createdAt >= startDate && t.createdAt <= endDate
    );
    const incidents = Array.from(this.incidents.values()).filter(
      i => i.detectedAt >= startDate && i.detectedAt <= endDate
    );

    // Ticket metrics
    const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;
    const closedTickets = tickets.filter(t => t.status === 'CLOSED').length;

    const avgResolutionTime = this.calculateAverageTime(
      tickets.filter(t => t.resolvedAt),
      (t) => this.calculateMinutesDiff(t.createdAt, t.resolvedAt!)
    );

    const avgResponseTime = this.calculateAverageTime(
      tickets.filter(t => t.responseAt),
      (t) => this.calculateMinutesDiff(t.createdAt, t.responseAt!)
    );

    // SLA metrics
    const ticketsWithSLA = tickets.filter(t => t.slaId);
    const slaCompliant = ticketsWithSLA.filter(t => !t.slaBreached).length;
    const overallCompliance = ticketsWithSLA.length > 0 ? (slaCompliant / ticketsWithSLA.length) * 100 : 0;

    // By priority
    const byPriority: any = {};
    ['P0_CRITICAL', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW'].forEach(priority => {
      const priorityTickets = tickets.filter(t => t.priority === priority);
      byPriority[priority] = {
        count: priorityTickets.length,
        avgResolutionTime: this.calculateAverageTime(
          priorityTickets.filter(t => t.resolvedAt),
          (t) => this.calculateMinutesDiff(t.createdAt, t.resolvedAt!)
        ),
      };
    });

    // By category
    const byCategory: any = {};
    tickets.forEach(t => {
      if (!byCategory[t.category]) {
        byCategory[t.category] = { count: 0, percentage: 0 };
      }
      byCategory[t.category].count += 1;
    });
    Object.keys(byCategory).forEach(cat => {
      byCategory[cat].percentage = (byCategory[cat].count / tickets.length) * 100;
    });

    // By channel
    const byChannel: any = {};
    tickets.forEach(t => {
      if (!byChannel[t.channel]) {
        byChannel[t.channel] = { count: 0, percentage: 0 };
      }
      byChannel[t.channel].count += 1;
    });
    Object.keys(byChannel).forEach(chan => {
      byChannel[chan].percentage = (byChannel[chan].count / tickets.length) * 100;
    });

    // Incident metrics
    const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL').length;
    const resolvedIncidents = incidents.filter(i => i.resolvedAt);
    const acknowledgedIncidents = incidents.filter(i => i.acknowledgedAt);

    const avgIncidentResolution = this.calculateAverageTime(
      resolvedIncidents,
      (i) => this.calculateMinutesDiff(i.detectedAt, i.resolvedAt!)
    );

    const mttr = avgIncidentResolution; // Mean Time To Resolve
    const mtta = this.calculateAverageTime(
      acknowledgedIncidents,
      (i) => this.calculateMinutesDiff(i.detectedAt, i.acknowledgedAt!)
    ); // Mean Time To Acknowledge

    return {
      period: { startDate, endDate },
      ticketMetrics: {
        totalTickets: tickets.length,
        openTickets,
        resolvedTickets,
        closedTickets,
        averageResolutionTime: avgResolutionTime,
        averageResponseTime: avgResponseTime,
        firstContactResolutionRate: 0, // TODO: Calculate based on single-response tickets
        reopenRate: 0, // TODO: Calculate based on reopened tickets
      },
      slaMetrics: {
        overallCompliance,
        responseCompliance: 0, // TODO: Calculate separately
        resolutionCompliance: 0, // TODO: Calculate separately
        breachedTickets: tickets.filter(t => t.slaBreached).length,
      },
      byPriority,
      byCategory,
      byChannel,
      agentPerformance: [], // TODO: Implement agent-specific metrics
      incidentMetrics: {
        totalIncidents: incidents.length,
        criticalIncidents,
        averageResolutionTime: avgIncidentResolution,
        mttr,
        mtta,
      },
      customerSatisfaction: {
        averageRating: 0, // TODO: Implement satisfaction surveys
        totalResponses: 0,
        nps: 0,
      },
    };
  }

  // ============ UTILITY METHODS ============

  private async addTicketUpdate(
    ticketId: string,
    data: {
      updateType: string;
      previousValue?: string;
      newValue?: string;
      notes?: string;
      updatedBy: string;
      updatedByName: string;
    }
  ): Promise<void> {
    const update: TicketUpdate = {
      id: this.generateId(),
      ticketId,
      updatedBy: data.updatedBy,
      updatedByName: data.updatedByName,
      updateType: data.updateType as any,
      previousValue: data.previousValue,
      newValue: data.newValue,
      notes: data.notes,
      createdAt: new Date(),
    };

    const updates = this.ticketUpdates.get(ticketId) || [];
    updates.push(update);
    this.ticketUpdates.set(ticketId, updates);
  }

  private async addIncidentTimelineEntry(
    incidentId: string,
    data: {
      eventType: string;
      description: string;
      performedBy: string;
      performedByName: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const entry: IncidentTimelineEntry = {
      id: this.generateId(),
      incidentId,
      timestamp: new Date(),
      eventType: data.eventType as any,
      description: data.description,
      performedBy: data.performedBy,
      performedByName: data.performedByName,
      metadata: data.metadata,
      createdAt: new Date(),
    };

    const timeline = this.incidentTimeline.get(incidentId) || [];
    timeline.push(entry);
    this.incidentTimeline.set(incidentId, timeline);
  }

  private async findApplicableSLAPolicy(priority: TicketPriority): Promise<SLAPolicy | null> {
    const policies = Array.from(this.slaPolicies.values());
    return policies.find(p => p.isActive && p.priority === priority) || null;
  }

  private getIncidentSLATargets(severity: IncidentSeverity): { responseTimeTarget: number; resolutionTimeTarget: number } {
    // Response and resolution targets in minutes based on severity
    const targets = {
      CRITICAL: { responseTimeTarget: 15, resolutionTimeTarget: 240 }, // 15min, 4hrs
      HIGH: { responseTimeTarget: 60, resolutionTimeTarget: 480 }, // 1hr, 8hrs
      MEDIUM: { responseTimeTarget: 240, resolutionTimeTarget: 1440 }, // 4hrs, 24hrs
      LOW: { responseTimeTarget: 1440, resolutionTimeTarget: 4320 }, // 24hrs, 72hrs
    };

    return targets[severity];
  }

  private calculateDeadline(startTime: Date, minutesOffset: number): Date {
    return new Date(startTime.getTime() + minutesOffset * 60 * 1000);
  }

  private calculateMinutesDiff(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  }

  private calculateAverageTime<T>(items: T[], timeExtractor: (item: T) => number): number {
    if (items.length === 0) return 0;
    const total = items.reduce((sum, item) => sum + timeExtractor(item), 0);
    return Math.floor(total / items.length);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTicketNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TKT-${dateStr}-${random}`;
  }

  private generateIncidentNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INC-${dateStr}-${random}`;
  }

  private generateKBArticleNumber(): string {
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `KB-${random}`;
  }
}
