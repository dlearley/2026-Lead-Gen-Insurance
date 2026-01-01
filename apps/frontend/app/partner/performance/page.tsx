import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

export default function PartnerPerformance() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Performance Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Performance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87/100</div>
            <p className="text-xs text-muted-foreground">Top 15% of partners</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lead Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42%</div>
            <p className="text-xs text-muted-foreground">+8% vs industry average</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3h</div>
            <p className="text-xs text-muted-foreground">-1.2h vs last quarter</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.7/5</div>
            <p className="text-xs text-muted-foreground">Based on 128 surveys</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">Performance trends chart would be displayed here</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
            <CardDescription>Performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Lead Quality Score</span>
                <span className="text-sm font-semibold">8.2/10</span>
              </div>
              <Progress value={82} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Conversion Velocity</span>
                <span className="text-sm font-semibold">7.8/10</span>
              </div>
              <Progress value={78} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Platform Utilization</span>
                <span className="text-sm font-semibold">9.1/10</span>
              </div>
              <Progress value={91} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Team Adoption</span>
                <span className="text-sm font-semibold">8.7/10</span>
              </div>
              <Progress value={87} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Lead Performance</TabsTrigger>
          <TabsTrigger value="conversion">Conversion Analysis</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Lead Performance Metrics</CardTitle>
              <CardDescription>Detailed lead performance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">1,248</div>
                  <div className="text-sm text-muted-foreground">Total Leads</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">524</div>
                  <div className="text-sm text-muted-foreground">Converted Leads</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">42%</div>
                  <div className="text-sm text-muted-foreground">Conversion Rate</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">$128K</div>
                  <div className="text-sm text-muted-foreground">Generated Revenue</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Lead Source Performance</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Web Form</span>
                      <span>48% conversion</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Referral</span>
                      <span>52% conversion</span>
                    </div>
                    <div className="flex justify-between">
                      <span>API Integration</span>
                      <span>38% conversion</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email Campaign</span>
                      <span>41% conversion</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Lead Quality Distribution</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>High Quality</span>
                      <span>32%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Medium Quality</span>
                      <span>48%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Low Quality</span>
                      <span>20%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="conversion">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Analysis</CardTitle>
              <CardDescription>Detailed conversion metrics and funnel analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Conversion Funnel</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Leads Received</span>
                        <span>1,248 (100%)</span>
                      </div>
                      <Progress value={100} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Leads Contacted</span>
                        <span>987 (79%)</span>
                      </div>
                      <Progress value={79} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Quotes Provided</span>
                        <span>642 (52%)</span>
                      </div>
                      <Progress value={52} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Policies Sold</span>
                        <span>524 (42%)</span>
                      </div>
                      <Progress value={42} />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-4">Conversion by Insurance Type</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Auto Insurance</span>
                      <span>45%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Home Insurance</span>
                      <span>38%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Life Insurance</span>
                      <span>52%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Health Insurance</span>
                      <span>35%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Commercial Insurance</span>
                      <span>48%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Individual and team performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Team Member</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-left p-2">Leads Handled</th>
                      <th className="text-left p-2">Conversion Rate</th>
                      <th className="text-left p-2">Avg Response Time</th>
                      <th className="text-left p-2">Performance Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">John Smith</td>
                      <td className="p-2">Manager</td>
                      <td className="p-2">148</td>
                      <td className="p-2">48%</td>
                      <td className="p-2">1.8h</td>
                      <td className="p-2">92/100</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Sarah Johnson</td>
                      <td className="p-2">Agent</td>
                      <td className="p-2">92</td>
                      <td className="p-2">42%</td>
                      <td className="p-2">2.4h</td>
                      <td className="p-2">88/100</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Mike Chen</td>
                      <td className="p-2">Agent</td>
                      <td className="p-2">78</td>
                      <td className="p-2">38%</td>
                      <td className="p-2">3.1h</td>
                      <td className="p-2">85/100</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Emily Davis</td>
                      <td className="p-2">Agent</td>
                      <td className="p-2">112</td>
                      <td className="p-2">45%</td>
                      <td className="p-2">2.0h</td>
                      <td className="p-2">90/100</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Top Performers</h3>
                  <ol className="space-y-2">
                    <li>1. John Smith - 92/100</li>
                    <li>2. Emily Davis - 90/100</li>
                    <li>3. Sarah Johnson - 88/100</li>
                  </ol>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Team Average</h3>
                  <div className="text-3xl font-bold">87/100</div>
                  <p className="text-sm text-muted-foreground">+5 points vs last quarter</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="roi">
          <Card>
            <CardHeader>
              <CardTitle>ROI Analysis</CardTitle>
              <CardDescription>Return on investment metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">$28,500</div>
                  <div className="text-sm text-muted-foreground">Monthly Platform Cost</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">$128,400</div>
                  <div className="text-sm text-muted-foreground">Monthly Revenue Generated</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">4.5x</div>
                  <div className="text-sm text-muted-foreground">ROI Multiplier</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Cost Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Platform Subscription</span>
                      <span>$20,000 (70%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Integration Costs</span>
                      <span>$5,000 (18%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Training & Support</span>
                      <span>$3,500 (12%)</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-4">Revenue Sources</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>New Policy Sales</span>
                      <span>$98,400 (77%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Policy Upgrades</span>
                      <span>$18,200 (14%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cross-sell Revenue</span>
                      <span>$11,800 (9%)</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-semibold mb-2">ROI Trends</h3>
                <div className="h-32 flex items-center justify-center border rounded">
                  <p className="text-muted-foreground">ROI trend chart would be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Performance Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold">Improve Response Time</h3>
              <p className="text-sm text-muted-foreground">Current: 2.3h | Target: < 2h</p>
              <p className="text-sm">Implement automated lead routing and notification escalation.</p>
            </div>
            <div>
              <h3 className="font-semibold">Enhance Lead Qualification</h3>
              <p className="text-sm text-muted-foreground">Current quality score: 8.2/10</p>
              <p className="text-sm">Use AI-powered lead scoring to prioritize high-potential leads.</p>
            </div>
            <div>
              <h3 className="font-semibold">Increase Team Training</h3>
              <p className="text-sm text-muted-foreground">55% Advanced Certification rate</p>
              <p className="text-sm">Encourage team members to complete advanced training modules.</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Performance Benchmarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Industry Comparison</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Your Conversion Rate:</span>
                  <span>42%</span>
                </div>
                <div className="flex justify-between">
                  <span>Industry Average:</span>
                  <span>34%</span>
                </div>
                <div className="flex justify-between">
                  <span>Top 10% Partners:</span>
                  <span>48%+</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Response Time Comparison</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Your Response Time:</span>
                  <span>2.3h</span>
                </div>
                <div className="flex justify-between">
                  <span>Industry Average:</span>
                  <span>3.8h</span>
                </div>
                <div className="flex justify-between">
                  <span>Top 10% Partners:</span>
                  <span>< 1.5h</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Performance Report</CardTitle>
          <CardDescription>Generate comprehensive performance reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Report Type</label>
              <select className="w-full p-2 border rounded">
                <option>Monthly Performance Summary</option>
                <option>Quarterly Business Review</option>
                <option>Annual Performance Report</option>
                <option>Custom Report</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <select className="w-full p-2 border rounded">
                <option>Last 30 Days</option>
                <option>Last Quarter</option>
                <option>Last 6 Months</option>
                <option>Custom Range</option>
              </select>
            </div>
          </div>
          <Button>Generate Report</Button>
        </CardContent>
      </Card>
    </div>
  );
}