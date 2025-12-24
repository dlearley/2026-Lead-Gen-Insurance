export interface EventBus {
  publish(subject: string, payload: unknown): Promise<void>;
  request<TResponse>(subject: string, payload: unknown, timeoutMs?: number): Promise<TResponse>;
  close(): Promise<void>;
}
