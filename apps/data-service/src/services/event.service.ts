// Event Service - Event logging and management
import { EventRepository } from '../repositories/event.repository';

export class EventService {
  
  /**
   * Log an event
   */
  static async logEvent(eventData: {
    type: string;
    source: string;
    entityType: string;
    entityId: string;
    data: any;
    metadata?: any;
  }): Promise<any> {
    try {
      return await EventRepository.create({
        type: eventData.type,
        source: eventData.source,
        entityType: eventData.entityType,
        entityId: eventData.entityId,
        data: eventData.data,
        metadata: eventData.metadata
      });
    } catch (error) {
      console.error('Failed to log event:', error);
      // Don't throw error to avoid breaking the main flow
      return null;
    }
  }

  /**
   * Get events by entity
   */
  static async getEventsByEntity(entityType: string, entityId: string): Promise<any[]> {
    try {
      return await EventRepository.findByEntity(entityType, entityId);
    } catch (error) {
      throw new Error(`Failed to get events: ${error.message}`);
    }
  }

  /**
   * Get recent events
   */
  static async getRecentEvents(limit: number = 50): Promise<any[]> {
    try {
      return await EventRepository.findRecent(limit);
    } catch (error) {
      throw new Error(`Failed to get recent events: ${error.message}`);
    }
  }

  /**
   * Get events by type
   */
  static async getEventsByType(type: string, limit: number = 50): Promise<any[]> {
    try {
      return await EventRepository.findByType(type, limit);
    } catch (error) {
      throw new Error(`Failed to get events by type: ${error.message}`);
    }
  }
}