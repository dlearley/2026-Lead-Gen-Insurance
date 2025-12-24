# Lead Communication System - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# From project root
npm install
# or if you have pnpm
pnpm install
```

### 2. Build Packages

```bash
# Build shared packages (types, core, config)
npm run build
```

### 3. Start Development Server

```bash
# Start API service
cd apps/api
npm run dev
```

The API will be available at: `http://localhost:3000`

### 4. Verify Installation

```bash
# Health check
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "insurance-lead-gen-api",
  "version": "1.0.0"
}
```

## Database Setup (Optional)

The system currently uses in-memory storage for development. To set up PostgreSQL:

### 1. Start Database

```bash
# Start PostgreSQL via Docker Compose
docker-compose up -d postgres
```

### 2. Push Prisma Schema

```bash
cd apps/data-service
npm run db:push
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. View Database

```bash
npm run db:studio
```

## Project Structure

```
insurance-lead-gen-ai/
├── apps/
│   ├── api/                      # REST API (Express)
│   │   └── src/
│   │       ├── app.ts            # Express app setup
│   │       ├── index.ts          # Server entry point
│   │       ├── routes/           # API routes
│   │       │   ├── leads.ts
│   │       │   ├── notes.ts
│   │       │   ├── activity.ts
│   │       │   ├── emails.ts
│   │       │   ├── tasks.ts
│   │       │   ├── notifications.ts
│   │       │   └── send-email.ts
│   │       ├── middleware/       # Express middleware
│   │       │   └── auth.ts
│   │       ├── storage/          # In-memory storage
│   │       │   └── in-memory.ts
│   │       └── utils/            # Utilities
│   │           ├── validation.ts
│   │           ├── pagination.ts
│   │           └── files.ts
│   └── data-service/             # Database service
│       └── prisma/
│           └── schema.prisma     # Database schema
├── packages/
│   ├── types/                    # Shared TypeScript types
│   ├── core/                     # Shared utilities
│   └── config/                   # Shared configuration
└── docs/
    ├── API.md                    # API documentation
    ├── COMMUNICATION_FEATURES.md # Feature documentation
    ├── USER_GUIDE.md             # User guide
    └── SETUP.md                  # This file
```

## Development Workflow

### Making Changes

1. **Edit code** in `apps/api/src/`
2. **Hot reload** is enabled - changes apply automatically
3. **Check logs** in the terminal for errors

### Adding New Endpoints

1. Create route file in `apps/api/src/routes/`
2. Import and use in `apps/api/src/app.ts`
3. Add types to `packages/types/src/index.ts`
4. Update validation in `apps/api/src/utils/validation.ts`

Example:

```typescript
// apps/api/src/routes/my-route.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.get('/', authMiddleware, async (req, res) => {
  res.json({ message: 'Hello' });
});

export default router;
```

```typescript
// apps/api/src/app.ts
import myRouter from './routes/my-route.js';
// ...
app.use('/api/v1/my-route', myRouter);
```

### Testing

```bash
# Run tests
cd apps/api
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Linting

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Environment Variables

Create a `.env` file in the project root:

```env
# API Port
API_PORT=3000

# Database (when using PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/insurance_lead_gen

# JWT (for production)
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Node Environment
NODE_ENV=development
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use a different port
API_PORT=3001 npm run dev
```

### TypeScript Errors

```bash
# Rebuild packages
npm run build

# Clean and rebuild
npm run clean
npm run build
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

## Production Deployment

### Build for Production

```bash
# Build all packages
npm run build
```

### Run Production Server

```bash
cd apps/api
npm start
```

### Environment Setup

1. Set secure `JWT_SECRET`
2. Configure production database URL
3. Set `NODE_ENV=production`
4. Configure SMTP for email sending
5. Set up file storage (S3/MinIO)

### Docker Deployment

Create `Dockerfile` for API:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY apps/api/dist ./apps/api/dist
COPY packages/*/dist ./packages/

CMD ["node", "apps/api/dist/index.js"]
```

Build and run:

```bash
docker build -t insurance-api .
docker run -p 3000:3000 insurance-api
```

## Next Steps

1. **Read the [User Guide](./USER_GUIDE.md)** to learn how to use the API
2. **Review [API Documentation](./API.md)** for endpoint details
3. **Check [Communication Features](./COMMUNICATION_FEATURES.md)** for technical overview

## Getting Help

- **Documentation**: Check `/docs` folder
- **Issues**: Create GitHub issue
- **Logs**: Check terminal output for errors
- **Health Check**: `curl http://localhost:3000/health`

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Validation](https://zod.dev/)
- [Prisma Documentation](https://www.prisma.io/docs/)
