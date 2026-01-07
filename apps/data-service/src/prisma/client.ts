import { PrismaClient } from '@prisma/client';
import { register, Histogram } from 'prom-client';

const serviceName = process.env.APP_NAME || 'data-service';

export const prisma = new PrismaClient().$extends({
  query: {
    async $allOperations({ model, operation, args, query }) {
      const start = Date.now();
      try {
        return await query(args);
      } finally {
        const duration = (Date.now() - start) / 1000;
        try {
          const metric = register.getSingleMetric('database_query_duration_seconds');
          if (metric instanceof Histogram) {
            metric.labels(operation, model || 'unknown', serviceName).observe(duration);
          }
        } catch (e) {
          // Ignore metric errors
        }
      }
    },
  },
});
