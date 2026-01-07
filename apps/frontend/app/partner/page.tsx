import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PartnerPortal() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Partner Portal</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>View your performance metrics and key insights</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/partner/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Training Center</CardTitle>
            <CardDescription>Access training modules and certification programs</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/partner/training">Go to Training</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Resource Library</CardTitle>
            <CardDescription>Download templates, guides, and best practices</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/partner/resources">Go to Resources</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Support Center</CardTitle>
            <CardDescription>Get help and submit support tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/partner/support">Get Support</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Performance Analytics</CardTitle>
            <CardDescription>Track your lead conversion and ROI</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/partner/performance">View Analytics</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage your team members and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/partner/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><Link href="/partner/onboarding" className="text-blue-600 hover:underline">Onboarding Checklist</Link></div>
            <div><Link href="/partner/certification" className="text-blue-600 hover:underline">Certification Program</Link></div>
            <div><Link href="/partner/community" className="text-blue-600 hover:underline">Partner Community</Link></div>
            <div><Link href="/partner/billing" className="text-blue-600 hover:underline">Billing & Contracts</Link></div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">New Training Modules Available</h3>
              <p className="text-sm text-gray-600">Advanced integration and analytics modules now live</p>
              <p className="text-xs text-gray-500">Posted 2 days ago</p>
            </div>
            <div>
              <h3 className="font-semibold">Partner Conference Registration Open</h3>
              <p className="text-sm text-gray-600">Annual partner summit - early bird pricing available</p>
              <p className="text-xs text-gray-500">Posted 1 week ago</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}