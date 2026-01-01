import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';

export default function PartnerOnboarding() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Partner Onboarding</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Onboarding Progress</CardTitle>
            <CardDescription>Track your onboarding journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Overall Progress</h3>
                  <span className="font-semibold">65% Complete</span>
                </div>
                <Progress value={65} />
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Pre-Onboarding (100%)</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">Complete partner intake assessment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">Sign partnership agreement</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">Provide required documentation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">Identify key stakeholders</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Technical Setup (75%)</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">Generate and distribute API keys</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">Configure webhooks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">Set up CRM integration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox disabled />
                      <span className="text-sm">Test all integrations</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Data Migration (50%)</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">Provide historical lead data</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">Review data mapping</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox disabled />
                      <span className="text-sm">Validate data accuracy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox disabled />
                      <span className="text-sm">Set up data synchronization</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">User Setup (50%)</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">Create admin user accounts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">Configure permissions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox disabled />
                      <span className="text-sm">Set up authentication</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox disabled />
                      <span className="text-sm">Complete training registration</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Go-Live Preparation (25%)</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex items-center gap-2">
                      <Checkbox checked disabled />
                      <span className="text-sm">Conduct system testing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox disabled />
                      <span className="text-sm">Review performance benchmarks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox disabled />
                      <span className="text-sm">Schedule go-live date</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox disabled />
                      <span className="text-sm">Prepare launch communications</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm">Kickoff Meeting</h3>
                <p className="text-xs text-muted-foreground">Completed: January 10, 2024</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Technical Setup</h3>
                <p className="text-xs text-muted-foreground">Target: January 17, 2024</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Data Migration</h3>
                <p className="text-xs text-muted-foreground">Target: January 24, 2024</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm">User Training</h3>
                <p className="text-xs text-muted-foreground">Target: January 31, 2024</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Go-Live</h3>
                <p className="text-xs text-muted-foreground">Target: February 7, 2024</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Key Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm">Partner Success Manager</h3>
                <p className="text-xs">Jane Doe</p>
                <p className="text-xs text-blue-600">jane.doe@insuranceleadgen.ai</p>
                <p className="text-xs">+1 (555) 123-4569</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Technical Support</h3>
                <p className="text-xs">Tech Support Team</p>
                <p className="text-xs text-blue-600">techsupport@insuranceleadgen.ai</p>
                <p className="text-xs">+1 (555) 123-4570</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Training Coordinator</h3>
                <p className="text-xs">Training Team</p>
                <p className="text-xs text-blue-600">training@insuranceleadgen.ai</p>
                <p className="text-xs">+1 (555) 123-4571</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Resources</CardTitle>
            <CardDescription>Helpful materials for your onboarding journey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold">Getting Started</h3>
              <ul className="text-sm space-y-1 ml-4">
                <li><a href="#" className="text-blue-600 hover:underline">Onboarding Checklist</a></li>
                <li><a href="#" className="text-blue-600 hover:underline">Platform Overview Guide</a></li>
                <li><a href="#" className="text-blue-600 hover:underline">FAQ for New Partners</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Technical Setup</h3>
              <ul className="text-sm space-y-1 ml-4">
                <li><a href="#" className="text-blue-600 hover:underline">API Integration Guide</a></li>
                <li><a href="#" className="text-blue-600 hover:underline">CRM Configuration Guide</a></li>
                <li><a href="#" className="text-blue-600 hover:underline">Security Setup Guide</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Training Materials</h3>
              <ul className="text-sm space-y-1 ml-4">
                <li><a href="#" className="text-blue-600 hover:underline">Training Schedule</a></li>
                <li><a href="#" className="text-blue-600 hover:underline">Platform Fundamentals Course</a></li>
                <li><a href="#" className="text-blue-600 hover:underline">Sandbox Environment Access</a></li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Immediate actions to keep onboarding on track</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="mt-1">1.</span>
                <div>
                  <h3 className="font-semibold text-sm">Complete Integration Testing</h3>
                  <p className="text-xs text-muted-foreground">Test all configured integrations and verify data flow</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">Test Integrations</Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="mt-1">2.</span>
                <div>
                  <h3 className="font-semibold text-sm">Validate Migrated Data</h3>
                  <p className="text-xs text-muted-foreground">Review data accuracy and completeness</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">Validate Data</Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="mt-1">3.</span>
                <div>
                  <h3 className="font-semibold text-sm">Schedule User Training</h3>
                  <p className="text-xs text-muted-foreground">Register team members for training sessions</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">Schedule Training</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Support</CardTitle>
          <CardDescription>Get help with your onboarding process</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600">📞</span>
            </div>
            <h3 className="font-semibold mb-1">Live Support</h3>
            <p className="text-sm text-muted-foreground mb-2">Get immediate assistance</p>
            <Button variant="outline" size="sm">Contact Support</Button>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600">📅</span>
            </div>
            <h3 className="font-semibold mb-1">Schedule Call</h3>
            <p className="text-sm text-muted-foreground mb-2">Book time with your success manager</p>
            <Button variant="outline" size="sm">Schedule Meeting</Button>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600">💬</span>
            </div>
            <h3 className="font-semibold mb-1">Community Help</h3>
            <p className="text-sm text-muted-foreground mb-2">Get advice from other partners</p>
            <Button variant="outline" size="sm">Visit Forum</Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center mt-6">
        <Button variant="outline">
          <Link href="/partner">Back to Partner Portal</Link>
        </Button>
      </div>
    </div>
  );
}