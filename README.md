# Insurance Leads Platform - Frontend

A modern Next.js 14 frontend application for the 2026 Lead Generation Insurance Platform. Built with TypeScript, Tailwind CSS, and state-of-the-art React patterns.

## 🚀 Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint + Prettier

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn or pnpm

## 🛠️ Installation

```bash
# Install dependencies
npm install

# or
yarn install

# or
pnpm install
```

## ⚙️ Configuration

Create a `.env.local` file in the root directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
API_TIMEOUT=30000

# Application Configuration
NEXT_PUBLIC_APP_NAME=Insurance Leads Platform
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🏃 Running the Application

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
.
├── app/                      # Next.js App Router pages
│   ├── dashboard/           # Dashboard pages
│   ├── login/               # Login page
│   ├── register/            # Registration page
│   ├── profile/             # User profile
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── ui/                  # UI component library
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   └── ...
│   ├── layout/              # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── AuthenticatedLayout.tsx
│   └── auth/                # Auth components
│       └── ProtectedRoute.tsx
├── services/                # API service layer
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── organization.service.ts
│   └── team.service.ts
├── stores/                  # Zustand state stores
│   ├── auth.store.ts
│   ├── user.store.ts
│   └── organization.store.ts
├── hooks/                   # Custom React hooks
│   ├── use-auth.ts
│   └── use-toast.ts
├── lib/                     # Utilities and config
│   └── api-client.ts
├── types/                   # TypeScript types
│   └── index.ts
└── utils/                   # Helper functions
    └── cn.ts
```

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Coverage
npm run test -- --coverage
```

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |

## 🎨 UI Components

### Button

```tsx
import { Button } from "@/components/ui/Button";

<Button variant="primary" size="md" isLoading={false}>
  Click me
</Button>
```

### Input

```tsx
import { Input } from "@/components/ui/Input";

<Input
  type="email"
  label="Email"
  placeholder="you@example.com"
  error={error}
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

### Modal

```tsx
import { Modal } from "@/components/ui/Modal";

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Modal Title">
  Modal content
</Modal>
```

## 🔐 Authentication

The application includes a complete authentication system:

- Login page (`/login`)
- Registration page (`/register`)
- Password reset (`/forgot-password`)
- Protected routes using `ProtectedRoute` component
- JWT token management with automatic refresh
- Session persistence using localStorage and cookies

### Usage

```tsx
import { useAuth } from "@/hooks/use-auth";

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleLogin = async () => {
    await login("user@example.com", "password");
  };

  return (
    <div>
      {isAuthenticated && <p>Welcome, {user?.firstName}</p>}
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
```

## 🌐 API Integration

The application uses a centralized API client with axios interceptors:

### Making API Calls

```tsx
import apiClient from "@/lib/api-client";
import { userService } from "@/services/user.service";

// Direct API call
const users = await apiClient.get("/api/v1/users/");

// Using service layer
const profile = await userService.getProfile();
```

### Service Layer Pattern

All API calls should go through the service layer for consistency:

```tsx
// services/user.service.ts
class UserService {
  async getProfile(): Promise<User> {
    return apiClient.get<User>("/api/v1/users/me/");
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return apiClient.patch<User>("/api/v1/users/me/", data);
  }
}

export const userService = new UserService();
```

## 📦 State Management

The application uses Zustand for state management:

```tsx
import { useAuthStore } from "@/stores/auth.store";

function MyComponent() {
  const { user, isAuthenticated, setUser, clearAuth } = useAuthStore();

  return <div>{user?.email}</div>;
}
```

## 🎯 Protected Routes

Use the `ProtectedRoute` component to guard authenticated pages:

```tsx
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";

export default function ProtectedPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Page Title">
        <div>Your protected content</div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
```

## 🧭 Routing

The application uses Next.js App Router:

- `/` - Redirects to `/dashboard`
- `/dashboard` - Main dashboard (protected)
- `/login` - Login page (public)
- `/register` - Registration page (public)
- `/forgot-password` - Password reset request (public)
- `/profile` - User profile (protected)
- `/leads` - Leads management (protected, coming in Phase 1.5)
- `/users` - User management (protected)
- `/organizations` - Organization management (protected)
- `/reports` - Reports (protected)
- `/documents` - Documents (protected)
- `/settings` - Settings (protected)

## 🎨 Design System

### Colors

- **Primary**: Blue palette (#3b82f6)
- **Secondary**: Gray/Slate palette
- **Success**: Green palette (#22c55e)
- **Warning**: Yellow/Orange palette (#f59e0b)
- **Error**: Red palette (#ef4444)

### Typography

- Font: Inter
- Scale: 10px base
- Weights: 400, 500, 600, 700

### Spacing

- Base unit: 0.25rem (4px)
- Consistent 4px scale

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Docker

```bash
# Build
docker build -t insurance-leads-frontend .

# Run
docker run -p 3000:3000 insurance-leads-frontend
```

### Environment Variables for Production

Make sure to set these environment variables in your production environment:

```env
NEXT_PUBLIC_API_URL=https://your-api.com
NEXT_PUBLIC_APP_URL=https://your-app.com
```

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [React Hook Form](https://react-hook-form.com/)
- [Vitest](https://vitest.dev/)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Commit with clear messages
5. Push and create a pull request

## 📄 License

Copyright © 2026 Insurance Leads Platform. All rights reserved.
