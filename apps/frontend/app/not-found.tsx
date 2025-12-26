import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-secondary-100 rounded-full mb-4">
            <FileQuestion className="w-10 h-10 text-secondary-500" />
          </div>
          <h1 className="text-4xl font-bold text-secondary-900 mb-2">404</h1>
          <h2 className="text-xl font-semibold text-secondary-900 mb-2">Page Not Found</h2>
          <p className="text-secondary-600 mb-6">
            Sorry, we couldn't find the page you're looking for. It might have been removed, renamed,
            or doesn't exist.
          </p>
          <div className="space-y-2">
            <Link href="/dashboard">
              <Button className="w-full" leftIcon={<Home className="h-4 w-4" />}>
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
