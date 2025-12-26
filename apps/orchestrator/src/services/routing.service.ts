import { Agent, Lead } from '@insurance-lead-gen/types';
import type { Redis } from 'ioredis';

export enum RoutingStrategy {
  ROUND_ROBIN = 'ROUND_ROBIN',
  LOAD_BALANCING = 'LOAD_BALANCING',
  HIGHEST_SCORE = 'HIGHEST_SCORE',
}

export class RoutingService {
  private roundRobinState: Map<string, number> = new Map();

  constructor(private readonly redis?: Redis) {}

  /**
   * Selects an agent from a list of candidates using the specified strategy.
   * 
   * @param agents List of candidate agents
   * @param strategy The routing strategy to use
   * @param context Additional context like the lead being routed
   * @returns The selected agent or null if no agents are available
   */
  public async selectAgent(
    agents: Agent[],
    strategy: RoutingStrategy = RoutingStrategy.ROUND_ROBIN,
    context?: { lead?: Lead }
  ): Promise<Agent | null> {
    if (!agents || agents.length === 0) {
      return null;
    }

    // Filter only active agents for routing
    const activeAgents = agents.filter(agent => agent.isActive);
    if (activeAgents.length === 0) {
      return null;
    }

    switch (strategy) {
      case RoutingStrategy.LOAD_BALANCING:
        return this.applyLoadBalancing(activeAgents);
      case RoutingStrategy.ROUND_ROBIN:
        return await this.applyRoundRobin(activeAgents, context?.lead?.insuranceType || 'default');
      case RoutingStrategy.HIGHEST_SCORE:
      default:
        return activeAgents[0];
    }
  }

  /**
   * Load balancing strategy: selects the agent with the lowest current lead count.
   */
  private applyLoadBalancing(agents: Agent[]): Agent {
    return agents.reduce((prev, curr) => 
      curr.currentLeadCount < prev.currentLeadCount ? curr : prev
    );
  }

  /**
   * Round-robin strategy: cycles through agents.
   * State is maintained per key (e.g. insurance type).
   * Supports Redis for distributed state or fallback to in-memory.
   */
  private async applyRoundRobin(agents: Agent[], key: string): Promise<Agent> {
    let nextIndex: number;

    if (this.redis) {
      const redisKey = `routing:round_robin:${key}`;
      const lastIndex = await this.redis.get(redisKey);
      nextIndex = lastIndex ? (parseInt(lastIndex, 10) + 1) % agents.length : 0;
      
      // Ensure the index is still valid if the list size changed
      if (nextIndex >= agents.length) {
        nextIndex = 0;
      }
      
      await this.redis.set(redisKey, nextIndex.toString());
    } else {
      const lastIndex = this.roundRobinState.get(key) ?? -1;
      nextIndex = (lastIndex + 1) % agents.length;
      this.roundRobinState.set(key, nextIndex);
    }

    return agents[nextIndex];
  }

  /**
   * Resets the round-robin state. Useful for testing.
   */
  public async resetState(): Promise<void> {
    this.roundRobinState.clear();
    if (this.redis) {
      const keys = await this.redis.keys('routing:round_robin:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}
