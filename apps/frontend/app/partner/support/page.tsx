import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PartnerSupport() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Support Center</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Submit a Support Ticket</CardTitle>
            <CardDescription>Our team typically responds within 2 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Input placeholder="Brief description of your issue" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="training">Training Request</SelectItem>
                      <SelectItem value="billing">Billing Question</SelectItem>
                      <SelectItem value="integration">Integration Help</SelectItem>
                      <SelectItem value="general">General Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Related Module</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leads">Lead Management</SelectItem>
                      <SelectItem value="reports">Reporting</SelectItem>
                      <SelectItem value="integrations">Integrations</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea 
                  placeholder="Please provide detailed information about your issue..."
                  rows={6}
                  required
                />
              </div>
              <div>
                <Button type="submit">Submit Ticket</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Support Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">Email Support</p>
                <a href="mailto:partnersupport@insuranceleadgen.ai" className="text-blue-600">partnersupport@insuranceleadgen.ai</a>
              </div>
              <div>
                <p className="font-medium">Phone Support</p>
                <p>+1 (555) 123-4567</p>
                <p className="text-sm text-muted-foreground">24/7 availability</p>
              </div>
              <div>
                <p className="font-medium">Emergency Support</p>
                <p>+1 (555) 123-4568</p>
                <p className="text-sm text-muted-foreground">Critical issues only</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Support Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="font-medium">Standard Support</p>
                <p className="text-sm">Mon-Fri: 8 AM - 8 PM EST</p>
                <p className="text-sm">Sat: 9 AM - 1 PM EST</p>
              </div>
              <div>
                <p className="font-medium">Response Time SLAs</p>
                <p className="text-sm">Critical: 1 hour</p>
                <p className="text-sm">High: 2 hours</p>
                <p className="text-sm">Medium: 4 hours</p>
                <p className="text-sm">Low: 8 hours</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Recent Support Tickets</CardTitle>
            <CardDescription>Track the status of your support requests</CardDescription>
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
                    <th className="text-left p-2">Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2">#1045</td>
                    <td className="p-2">API Integration Issue</td>
                    <td className="p-2">In Progress</td>
                    <td className="p-2">High</td>
                    <td className="p-2">2 hours ago</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">#1042</td>
                    <td className="p-2">Training Access Request</td>
                    <td className="p-2">Resolved</td>
                    <td className="p-2">Medium</td>
                    <td className="p-2">Jan 12, 2024</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">#1038</td>
                    <td className="p-2">Reporting Dashboard Issue</td>
                    <td className="p-2">Closed</td>
                    <td className="p-2">Low</td>
                    <td className="p-2">Jan 10, 2024</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>Find answers to common questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <a href="#" className="text-blue-600 hover:underline font-medium">Getting Started Guide</a>
            </div>
            <div>
              <a href="#" className="text-blue-600 hover:underline font-medium">Troubleshooting Common Issues</a>
            </div>
            <div>
              <a href="#" className="text-blue-600 hover:underline font-medium">API Integration Documentation</a>
            </div>
            <div>
              <a href="#" className="text-blue-600 hover:underline font-medium">Training Resources</a>
            </div>
            <div>
              <a href="#" className="text-blue-600 hover:underline font-medium">FAQ Database</a>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Support Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold">Training Videos</h3>
              <p className="text-sm text-muted-foreground">Step-by-step video tutorials</p>
              <Button variant="outline" size="sm">View Videos</Button>
            </div>
            <div>
              <h3 className="font-semibold">User Guides</h3>
              <p className="text-sm text-muted-foreground">Comprehensive documentation</p>
              <Button variant="outline" size="sm">View Guides</Button>
            </div>
            <div>
              <h3 className="font-semibold">Community Forum</h3>
              <p className="text-sm text-muted-foreground">Get help from other partners</p>
              <Button variant="outline" size="sm">Visit Forum</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Escalation Process</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Level 1: Support Team</h3>
              <p className="text-sm text-muted-foreground">Initial response and troubleshooting</p>
              <p className="text-sm text-muted-foreground">Response time: 2-4 hours</p>
            </div>
            <div>
              <h3 className="font-semibold">Level 2: Senior Support</h3>
              <p className="text-sm text-muted-foreground">Complex technical issues</p>
              <p className="text-sm text-muted-foreground">Response time: 4-8 hours</p>
            </div>
            <div>
              <h3 className="font-semibold">Level 3: Partner Success Manager</h3>
              <p className="text-sm text-muted-foreground">Strategic issues and escalations</p>
              <p className="text-sm text-muted-foreground">Response time: 8-24 hours</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Support Satisfaction</CardTitle>
          <CardDescription>Help us improve our support services</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">We value your feedback! Please take a moment to rate your recent support experiences.</p>
          <Button variant="outline">Provide Feedback</Button>
        </CardContent>
      </Card>
    </div>
  );
}