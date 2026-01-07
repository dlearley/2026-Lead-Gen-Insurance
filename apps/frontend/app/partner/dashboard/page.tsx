import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export default function PartnerDashboard() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Partner Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,248</div>
            <p className="text-xs text-muted-foreground">+24% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42%</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18/25</div>
            <p className="text-xs text-muted-foreground">72% adoption rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">280%</div>
            <p className="text-xs text-muted-foreground">Annualized return</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">Performance chart would be displayed here</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Training Progress</CardTitle>
            <CardDescription>Team certification status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Basic Certification</span>
                <span className="text-sm">85%</span>
              </div>
              <Progress value={85} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Advanced Certification</span>
                <span className="text-sm">55%</span>
              </div>
              <Progress value={55} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Expert Certification</span>
                <span className="text-sm">20%</span>
              </div>
              <Progress value={20} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Lead Performance</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="support">Support Tickets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Lead Performance</CardTitle>
              <CardDescription>Recent lead activity and conversion metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Leads Received</th>
                      <th className="text-left p-2">Leads Converted</th>
                      <th className="text-left p-2">Conversion Rate</th>
                      <th className="text-left p-2">Avg Response Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">2024-01-15</td>
                      <td className="p-2">48</td>
                      <td className="p-2">21</td>
                      <td className="p-2">43.75%</td>
                      <td className="p-2">2.4h</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">2024-01-14</td>
                      <td className="p-2">36</td>
                      <td className="p-2">15</td>
                      <td className="p-2">41.67%</td>
                      <td className="p-2">3.1h</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">2024-01-13</td>
                      <td className="p-2">52</td>
                      <td className="p-2">23</td>
                      <td className="p-2">44.23%</td>
                      <td className="p-2">2.8h</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>Recent user engagement and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-left p-2">Last Active</th>
                      <th className="text-left p-2">Leads Handled</th>
                      <th className="text-left p-2">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">John Smith</td>
                      <td className="p-2">Manager</td>
                      <td className="p-2">Today</td>
                      <td className="p-2">148</td>
                      <td className="p-2">48%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Sarah Johnson</td>
                      <td className="p-2">Agent</td>
                      <td className="p-2">Today</td>
                      <td className="p-2">92</td>
                      <td className="p-2">42%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Mike Chen</td>
                      <td className="p-2">Agent</td>
                      <td className="p-2">Yesterday</td>
                      <td className="p-2">78</td>
                      <td className="p-2">38%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>Recent support requests and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Priority</th>
                      <th className="text-left p-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">#1045</td>
                      <td className="p-2">API Integration Issue</td>
                      <td className="p-2">In Progress</td>
                      <td className="p-2">High</td>
                      <td className="p-2">2024-01-15</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">#1042</td>
                      <td className="p-2">Training Access Request</td>
                      <td className="p-2">Resolved</td>
                      <td className="p-2">Medium</td>
                      <td className="p-2">2024-01-12</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">#1038</td>
                      <td className="p-2">Reporting Dashboard Issue</td>
                      <td className="p-2">Closed</td>
                      <td className="p-2">Low</td>
                      <td className="p-2">2024-01-10</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              Create Support Ticket
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Add New User
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Generate Performance Report
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Request Training Session
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Partner Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><a href="#" className="text-blue-600 hover:underline">Onboarding Guide</a></div>
            <div><a href="#" className="text-blue-600 hover:underline">Training Curriculum</a></div>
            <div><a href="#" className="text-blue-600 hover:underline">Certification Program</a></div>
            <div><a href="#" className="text-blue-600 hover:underline">API Documentation</a></div>
            <div><a href="#" className="text-blue-600 hover:underline">Best Practices Guide</a></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}