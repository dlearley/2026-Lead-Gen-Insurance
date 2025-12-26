import { Controller, Get, Header } from '@nestjs/common';
import { register } from '../middleware/metrics.middleware.js';

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', register.contentType)
  async getMetrics(): Promise<string> {
    return await register.metrics();
  }

  @Get('health')
  healthCheck(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
