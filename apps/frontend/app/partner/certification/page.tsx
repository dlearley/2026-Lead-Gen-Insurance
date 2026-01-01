import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function PartnerCertification() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Certification Program</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Certification Progress</CardTitle>
            <CardDescription>Track your journey to becoming a certified expert</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="border-b pb-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">Basic Certification</h3>
                    <p className="text-sm text-muted-foreground">Platform Fundamentals and Core Features</p>
                  </div>
                  <Badge variant="secondary" className="text-sm">In Progress</Badge>
                </div>
                <div className="mb-2">
                  <Progress value={75} />
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>75% Complete</span>
                  <span>3 of 4 modules finished</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>✅</span>
                    <span>Platform Fundamentals Module</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>✅</span>
                    <span>Lead Management Module</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>✅</span>
                    <span>Basic Reporting Module</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>❌</span>
                    <span>Compliance Fundamentals Module</span>
                  </div>
                </div>
                <Button className="mt-4 w-full">Continue Basic Certification</Button>
              </div>
              
              <div className="border-b pb-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">Advanced Certification</h3>
                    <p className="text-sm text-muted-foreground">Advanced Features and Integration</p>
                  </div>
                  <Badge variant="outline" className="text-sm">Locked</Badge>
                </div>
                <div className="mb-2">
                  <Progress value={0} />
                </div>
                <div className="text-sm mb-2">
                  <span>Prerequisite: </span>
                  <span className="font-medium">Complete Basic Certification</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>❌</span>
                    <span>Advanced Lead Management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>❌</span>
                    <span>CRM Integration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>❌</span>
                    <span>Automation Rules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>❌</span>
                    <span>Performance Analytics</span>
                  </div>
                </div>
                <Button className="mt-4 w-full" disabled>Start Advanced Certification</Button>
              </div>
              
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">Expert Certification</h3>
                    <p className="text-sm text-muted-foreground">Comprehensive Platform Mastery</p>
                  </div>
                  <Badge variant="outline" className="text-sm">Locked</Badge>
                </div>
                <div className="mb-2">
                  <Progress value={0} />
                </div>
                <div className="text-sm mb-2">
                  <span>Prerequisites: </span>
                  <span className="font-medium">Advanced Certification + 1 year experience</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>❌</span>
                    <span>Platform Architecture</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>❌</span>
                    <span>API Integration Mastery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>❌</span>
                    <span>Best Practices Implementation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>❌</span>
                    <span>Mentorship Program</span>
                  </div>
                </div>
                <Button className="mt-4 w-full" disabled>Start Expert Certification</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Certification Benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="mt-1">🏆</span>
                <span className="text-sm">Professional recognition and digital badges</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1">📞</span>
                <span className="text-sm">Priority support with faster response times</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1">🔒</span>
                <span className="text-sm">Exclusive access to advanced features and beta programs</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1">🤝</span>
                <span className="text-sm">Networking opportunities with other certified professionals</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1">📈</span>
                <span className="text-sm">Enhanced career advancement opportunities</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Certification Exams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm">Basic Certification Exam</h3>
                <p className="text-xs text-muted-foreground">February 15, 2024 • 10:00 AM EST</p>
                <p className="text-xs text-muted-foreground">Online Proctored</p>
                <Button variant="outline" size="sm" className="mt-2 w-full">Register</Button>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Advanced Certification Exam</h3>
                <p className="text-xs text-muted-foreground">March 1, 2024 • 2:00 PM EST</p>
                <p className="text-xs text-muted-foreground">Online Proctored</p>
                <Button variant="outline" size="sm" className="mt-2 w-full" disabled>Register</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <h2 className="text-2xl font-bold mb-6">Certification Tiers</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-xl">B</span>
            </div>
            <CardTitle>Basic Certification</CardTitle>
            <CardDescription>Platform Fundamentals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold text-sm">Requirements</h3>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Complete Platform Fundamentals module</li>
                <li>• Pass Basic Certification Exam (30 questions, 80% score)</li>
                <li>• Demonstrate basic platform navigation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Validity</h3>
              <p className="text-sm">1 year</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Renewal</h3>
              <p className="text-sm">Complete annual refresher course</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled>Get Certified</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold text-xl">A</span>
            </div>
            <CardTitle>Advanced Certification</CardTitle>
            <CardDescription>Advanced Features & Integration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold text-sm">Requirements</h3>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Basic Certification + 6 months experience</li>
                <li>• Complete 4 additional training modules</li>
                <li>• Pass Advanced Certification Exam (50 questions, 85% score)</li>
                <li>• Complete hands-on practical assessment</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Validity</h3>
              <p className="text-sm">2 years</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Renewal</h3>
              <p className="text-sm">Complete 2 continuing education courses</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled>Get Certified</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold text-xl">E</span>
            </div>
            <CardTitle>Expert Certification</CardTitle>
            <CardDescription>Comprehensive Platform Mastery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold text-sm">Requirements</h3>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Advanced Certification + 1 year experience</li>
                <li>• Complete all training modules</li>
                <li>• Pass Expert Certification Exam (75 questions, 90% score)</li>
                <li>• Present best practice implementation</li>
                <li>• Mentor 2 new partners</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Validity</h3>
              <p className="text-sm">2 years</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Renewal</h3>
              <p className="text-sm">Complete 3 CE courses + ongoing mentorship</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled>Get Certified</Button>
          </CardFooter>
        </Card>
      </div>
      
      <h2 className="text-2xl font-bold mb-6">Specialty Certifications</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-bold">I</span>
            </div>
            <CardTitle className="text-sm">Integration Specialist</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>Focus on API integration, webhooks, and third-party system connections.</p>
            <p className="font-semibold">Prerequisite: Advanced Certification</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" disabled>Learn More</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">A</span>
            </div>
            <CardTitle className="text-sm">Analytics Specialist</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>Advanced reporting, data analysis, and performance metrics expertise.</p>
            <p className="font-semibold">Prerequisite: Advanced Certification</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" disabled>Learn More</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">C</span>
            </div>
            <CardTitle className="text-sm">Compliance Specialist</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>Regulatory compliance, data privacy, and platform security focus.</p>
            <p className="font-semibold">Prerequisite: Advanced Certification</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" disabled>Learn More</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">T</span>
            </div>
            <CardTitle className="text-sm">Training Specialist</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>User training, knowledge transfer, and adoption strategies expertise.</p>
            <p className="font-semibold">Prerequisite: Expert Certification</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="w-full" disabled>Learn More</Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Team Certification Status</CardTitle>
            <CardDescription>Track your team's certification achievements</CardDescription>
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
                    <th className="text-left p-2">Expert Cert</th>
                    <th className="text-left p-2">Specialty Certs</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2">John Smith</td>
                    <td className="p-2">Manager</td>
                    <td className="p-2">✅ Certified</td>
                    <td className="p-2">📚 In Progress</td>
                    <td className="p-2">❌ Not Started</td>
                    <td className="p-2">❌ None</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Sarah Johnson</td>
                    <td className="p-2">Agent</td>
                    <td className="p-2">📚 In Progress</td>
                    <td className="p-2">❌ Not Started</td>
                    <td className="p-2">❌ Not Started</td>
                    <td className="p-2">❌ None</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Mike Chen</td>
                    <td className="p-2">Agent</td>
                    <td className="p-2">✅ Certified</td>
                    <td className="p-2">❌ Not Started</td>
                    <td className="p-2">❌ Not Started</td>
                    <td className="p-2">❌ None</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Emily Davis</td>
                    <td className="p-2">Agent</td>
                    <td className="p-2">✅ Certified</td>
                    <td className="p-2">✅ Certified</td>
                    <td className="p-2">📚 In Progress</td>
                    <td className="p-2">✅ Integration</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Certification Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold">62%</div>
              <div className="text-sm text-muted-foreground">Team Basic Certification Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">25%</div>
              <div className="text-sm text-muted-foreground">Team Advanced Certification Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">1</div>
              <div className="text-sm text-muted-foreground">Expert Certified Users</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Certification Resources</CardTitle>
          <CardDescription>Materials to help you prepare for certification</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Study Guides</h3>
            <ul className="text-sm space-y-1">
              <li><a href="#" className="text-blue-600 hover:underline">Basic Certification Guide</a></li>
              <li><a href="#" className="text-blue-600 hover:underline">Advanced Certification Guide</a></li>
              <li><a href="#" className="text-blue-600 hover:underline">Expert Certification Guide</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Practice Exams</h3>
            <ul className="text-sm space-y-1">
              <li><a href="#" className="text-blue-600 hover:underline">Basic Practice Exam</a></li>
              <li><a href="#" className="text-blue-600 hover:underline">Advanced Practice Exam</a></li>
              <li><a href="#" className="text-blue-600 hover:underline">Expert Practice Exam</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Exam Preparation</h3>
            <ul className="text-sm space-y-1">
              <li><a href="#" className="text-blue-600 hover:underline">Exam Tips & Strategies</a></li>
              <li><a href="#" className="text-blue-600 hover:underline">Study Plan Template</a></li>
              <li><a href="#" className="text-blue-600 hover:underline">Flash Cards</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Support</h3>
            <ul className="text-sm space-y-1">
              <li><a href="#" className="text-blue-600 hover:underline">Certification FAQ</a></li>
              <li><a href="#" className="text-blue-600 hover:underline">Mentorship Program</a></li>
              <li><a href="#" className="text-blue-600 hover:underline">Study Groups</a></li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center mt-6">
        <Button variant="outline">
          <Link href="/partner/training">Back to Training Center</Link>
        </Button>
      </div>
    </div>
  );
}