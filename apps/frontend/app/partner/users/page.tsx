import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function PartnerUsers() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">User Management</h1>
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <Input placeholder="Search users..." className="max-w-md" />
          <Button>Search</Button>
        </div>
        <Button>
          <Link href="/partner/users/add">Add New User</Link>
        </Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Active Users</CardTitle>
          <CardDescription>Manage your team members and their access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Last Active</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">John Smith</td>
                  <td className="p-2">john.smith@agency.com</td>
                  <td className="p-2">Manager</td>
                  <td className="p-2"><Badge variant="secondary">Active</Badge></td>
                  <td className="p-2">Today</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Reset Password</Button>
                    </div>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Sarah Johnson</td>
                  <td className="p-2">sarah.johnson@agency.com</td>
                  <td className="p-2">Agent</td>
                  <td className="p-2"><Badge variant="secondary">Active</Badge></td>
                  <td className="p-2">Yesterday</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Reset Password</Button>
                    </div>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Mike Chen</td>
                  <td className="p-2">mike.chen@agency.com</td>
                  <td className="p-2">Agent</td>
                  <td className="p-2"><Badge variant="secondary">Active</Badge></td>
                  <td className="p-2">2 days ago</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Reset Password</Button>
                    </div>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Emily Davis</td>
                  <td className="p-2">emily.davis@agency.com</td>
                  <td className="p-2">Agent</td>
                  <td className="p-2"><Badge variant="secondary">Active</Badge></td>
                  <td className="p-2">Today</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Reset Password</Button>
                    </div>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Robert Wilson</td>
                  <td className="p-2">robert.wilson@agency.com</td>
                  <td className="p-2">Support Contact</td>
                  <td className="p-2"><Badge variant="outline">Inactive</Badge></td>
                  <td className="p-2">1 week ago</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Activate</Button>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Activity Summary</CardTitle>
            <CardDescription>Recent user activity and engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold">18</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold">7</div>
                <div className="text-sm text-muted-foreground">Inactive Users</div>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold">85%</div>
                <div className="text-sm text-muted-foreground">Adoption Rate</div>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold">4.2h</div>
                <div className="text-sm text-muted-foreground">Avg Daily Usage</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              Add New User
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Bulk User Import
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Export User List
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Send Welcome Email
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>Define and manage user roles and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Standard Roles</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 border rounded">
                  <span>Admin</span>
                  <Badge variant="secondary">Full Access</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span>Manager</span>
                  <Badge variant="secondary">Team Management</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span>Agent</span>
                  <Badge variant="secondary">Lead Management</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span>Support Contact</span>
                  <Badge variant="secondary">Read-Only</Badge>
                </div>
              </div>
            </div>
            <Button variant="outline">Create Custom Role</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>User Onboarding</CardTitle>
            <CardDescription>Streamline new user setup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold">Onboarding Checklist</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>User account created</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>Welcome email sent</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>Training assigned</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>❌</span>
                  <span>First login completed</span>
                </div>
              </div>
            </div>
            <Button variant="outline">Send Onboarding Email</Button>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>User Training Status</CardTitle>
          <CardDescription>Track your team's training progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Basic Certification</th>
                  <th className="text-left p-2">Advanced Certification</th>
                  <th className="text-left p-2">Last Training</th>
                  <th className="text-left p-2">Training Hours</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">John Smith</td>
                  <td className="p-2">✅ Certified</td>
                  <td className="p-2">📚 In Progress</td>
                  <td className="p-2">Jan 10, 2024</td>
                  <td className="p-2">12.5h</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Sarah Johnson</td>
                  <td className="p-2">📚 In Progress</td>
                  <td className="p-2">❌ Not Started</td>
                  <td className="p-2">Jan 8, 2024</td>
                  <td className="p-2">8.2h</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Mike Chen</td>
                  <td className="p-2">✅ Certified</td>
                  <td className="p-2">❌ Not Started</td>
                  <td className="p-2">Dec 15, 2023</td>
                  <td className="p-2">6.8h</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline">
            <Link href="/partner/training">View Full Training Center</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}