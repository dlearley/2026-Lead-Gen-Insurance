import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function PartnerTraining() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Training Center</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Training Progress</CardTitle>
            <CardDescription>Track your certification journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-semibold">Basic Certification</h3>
                    <p className="text-sm text-muted-foreground">Platform Fundamentals</p>
                  </div>
                  <Badge variant="secondary">In Progress</Badge>
                </div>
                <Progress value={75} className="mb-2" />
                <p className="text-sm">75% Complete - 3 of 4 modules finished</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Continue Learning
                </Button>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-semibold">Advanced Certification</h3>
                    <p className="text-sm text-muted-foreground">Advanced Features & Integration</p>
                  </div>
                  <Badge variant="outline">Not Started</Badge>
                </div>
                <Progress value={0} className="mb-2" />
                <p className="text-sm">Prerequisite: Complete Basic Certification</p>
                <Button variant="outline" size="sm" className="mt-2" disabled>
                  Start Training
                </Button>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-semibold">Integration Specialist</h3>
                    <p className="text-sm text-muted-foreground">API & CRM Integration</p>
                  </div>
                  <Badge variant="outline">Not Started</Badge>
                </div>
                <Progress value={0} className="mb-2" />
                <p className="text-sm">Prerequisite: Advanced Certification</p>
                <Button variant="outline" size="sm" className="mt-2" disabled>
                  Start Training
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Training Sessions</CardTitle>
            <CardDescription>Live virtual training opportunities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="font-semibold">Platform Fundamentals</h3>
              <p className="text-sm text-muted-foreground">January 22, 2024 • 10:00 AM EST</p>
              <p className="text-sm">Beginner session covering platform navigation and basic features</p>
              <Button variant="outline" size="sm" className="mt-2">
                Register
              </Button>
            </div>
            <div className="border-b pb-2">
              <h3 className="font-semibold">Lead Management Best Practices</h3>
              <p className="text-sm text-muted-foreground">January 24, 2024 • 2:00 PM EST</p>
              <p className="text-sm">Advanced techniques for lead qualification and conversion</p>
              <Button variant="outline" size="sm" className="mt-2">
                Register
              </Button>
            </div>
            <div>
              <h3 className="font-semibold">API Integration Workshop</h3>
              <p className="text-sm text-muted-foreground">January 29, 2024 • 11:00 AM EST</p>
              <p className="text-sm">Hands-on session for technical users</p>
              <Button variant="outline" size="sm" className="mt-2">
                Register
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <h2 className="text-2xl font-bold mb-6">Training Modules</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Platform Fundamentals</CardTitle>
            <CardDescription>Introduction to platform navigation and basic concepts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Duration:</span>
                <span>2 hours</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Level:</span>
                <span>Beginner</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <Badge variant="secondary">In Progress</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Continue Module</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Lead Management</CardTitle>
            <CardDescription>Master lead qualification, follow-up, and conversion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Duration:</span>
                <span>3 hours</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Level:</span>
                <span>Intermediate</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <Badge variant="secondary">In Progress</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Continue Module</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>CRM Integration</CardTitle>
            <CardDescription>Seamless integration with partner CRM systems</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Duration:</span>
                <span>2 hours</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Level:</span>
                <span>Intermediate</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <Badge variant="outline">Not Started</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">Start Module</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Advanced Features</CardTitle>
            <CardDescription>Utilize advanced platform capabilities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Duration:</span>
                <span>3 hours</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Level:</span>
                <span>Advanced</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <Badge variant="outline">Not Started</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              Start Module
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Compliance Training</CardTitle>
            <CardDescription>Ensure regulatory compliance and data security</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Duration:</span>
                <span>2 hours</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Level:</span>
                <span>All Levels</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <Badge variant="outline">Not Started</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">Start Module</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Performance Optimization</CardTitle>
            <CardDescription>Maximize platform ROI and efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Duration:</span>
                <span>2 hours</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Level:</span>
                <span>Advanced</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <Badge variant="outline">Not Started</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              Start Module
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Team Training Progress</CardTitle>
            <CardDescription>Track your team's certification status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Team Member</th>
                    <th className="text-left p-2">Role</th>
                    <th className="text-left p-2">Basic Cert</th>
                    <th className="text-left p-2">Advanced Cert</th>
                    <th className="text-left p-2">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2">John Smith</td>
                    <td className="p-2">Manager</td>
                    <td className="p-2">✅ Certified</td>
                    <td className="p-2">📚 In Progress</td>
                    <td className="p-2">Today</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Sarah Johnson</td>
                    <td className="p-2">Agent</td>
                    <td className="p-2">📚 In Progress</td>
                    <td className="p-2">❌ Not Started</td>
                    <td className="p-2">Yesterday</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Mike Chen</td>
                    <td className="p-2">Agent</td>
                    <td className="p-2">✅ Certified</td>
                    <td className="p-2">❌ Not Started</td>
                    <td className="p-2">2 days ago</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Training Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <a href="#" className="text-blue-600 hover:underline font-medium">Training Quick Start Guide</a>
              <p className="text-sm text-muted-foreground">Get started with our training program</p>
            </div>
            <div>
              <a href="#" className="text-blue-600 hover:underline font-medium">Certification Exam Guide</a>
              <p className="text-sm text-muted-foreground">Prepare for certification exams</p>
            </div>
            <div>
              <a href="#" className="text-blue-600 hover:underline font-medium">Sandbox Environment</a>
              <p className="text-sm text-muted-foreground">Practice in a safe test environment</p>
            </div>
            <div>
              <a href="#" className="text-blue-600 hover:underline font-medium">Training FAQ</a>
              <p className="text-sm text-muted-foreground">Common training questions</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Certification Program</CardTitle>
          <CardDescription>Earn recognition for your platform expertise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">B</span>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Basic Certification</h3>
              <p className="text-sm text-muted-foreground mb-4">Platform Fundamentals and core features</p>
              <Button variant="outline" className="w-full">Learn More</Button>
            </div>
            
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">A</span>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Advanced Certification</h3>
              <p className="text-sm text-muted-foreground mb-4">Advanced features and integration capabilities</p>
              <Button variant="outline" className="w-full" disabled>Learn More</Button>
            </div>
            
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-bold">E</span>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Expert Certification</h3>
              <p className="text-sm text-muted-foreground mb-4">Comprehensive platform mastery and leadership</p>
              <Button variant="outline" className="w-full" disabled>Learn More</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-6 text-center">
        <Button variant="outline">
          <Link href="/partner/certification">View Full Certification Program</Link>
        </Button>
      </div>
    </div>
  );
}