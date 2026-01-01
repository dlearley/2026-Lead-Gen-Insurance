import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PartnerResources() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Resource Library</h1>
      
      <div className="mb-6">
        <div className="flex gap-2">
          <Input placeholder="Search resources..." className="max-w-md" />
          <Button>Search</Button>
        </div>
      </div>
      
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates & Scripts</TabsTrigger>
          <TabsTrigger value="guides">Guides & Documentation</TabsTrigger>
          <TabsTrigger value="tools">Tools & Calculators</TabsTrigger>
          <TabsTrigger value="marketing">Marketing Materials</TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>Pre-written email templates for various scenarios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Lead Follow-up Template</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Welcome Email Template</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Policy Renewal Template</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Referral Request Template</a></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Call Scripts</CardTitle>
                <CardDescription>Structured call scripts for different lead types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Auto Insurance Script</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Home Insurance Script</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Life Insurance Script</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Objection Handling Guide</a></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Proposal Templates</CardTitle>
                <CardDescription>Professional proposal templates for clients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Comprehensive Insurance Proposal</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Quick Quote Template</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Comparison Analysis Template</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Coverage Summary Template</a></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Checklists</CardTitle>
                <CardDescription>Step-by-step checklists for common processes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">New Lead Onboarding Checklist</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Policy Renewal Checklist</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Claim Processing Checklist</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Compliance Audit Checklist</a></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>SOP Templates</CardTitle>
                <CardDescription>Standard Operating Procedures for your agency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Lead Qualification SOP</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Client Onboarding SOP</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Data Security SOP</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Customer Service SOP</a></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="guides">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started Guides</CardTitle>
                <CardDescription>Step-by-step guides for new users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Platform Quick Start Guide</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Admin Setup Guide</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Agent Onboarding Guide</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Mobile App Guide</a></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Best Practices</CardTitle>
                <CardDescription>Proven strategies for success</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Lead Conversion Best Practices</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Customer Retention Strategies</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Performance Optimization Guide</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Team Management Best Practices</a></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Integration Guides</CardTitle>
                <CardDescription>Detailed integration documentation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Salesforce Integration Guide</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">HubSpot Integration Guide</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">API Integration Guide</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Webhook Setup Guide</a></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Compliance Resources</CardTitle>
                <CardDescription>Regulatory compliance materials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">GDPR Compliance Guide</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">CCPA Compliance Guide</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Data Privacy Best Practices</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Insurance Regulation Guide</a></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Troubleshooting</CardTitle>
                <CardDescription>Solutions to common issues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Common Integration Issues</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Performance Optimization</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Error Code Reference</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">FAQ Database</a></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="tools">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ROI Calculator</CardTitle>
                <CardDescription>Calculate your return on investment</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Estimate the financial impact of using our platform.</p>
                <Button className="w-full">Launch ROI Calculator</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Lead Scoring Tool</CardTitle>
                <CardDescription>Evaluate lead quality and potential</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Assess leads based on multiple criteria and get conversion probability.</p>
                <Button className="w-full">Launch Lead Scoring Tool</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance Benchmarking</CardTitle>
                <CardDescription>Compare your performance with industry standards</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">See how your conversion rates and metrics stack up against peers.</p>
                <Button className="w-full">Launch Benchmarking Tool</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Commission Calculator</CardTitle>
                <CardDescription>Calculate commissions and earnings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Estimate earnings based on different scenarios and lead volumes.</p>
                <Button className="w-full">Launch Commission Calculator</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Conversion Rate Optimizer</CardTitle>
                <CardDescription>Get recommendations to improve conversion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Analyze your current performance and get actionable insights.</p>
                <Button className="w-full">Launch Conversion Optimizer</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="marketing">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Co-Marketing Materials</CardTitle>
                <CardDescription>Joint marketing materials for partners</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Platform Overview Presentation</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Case Study Template</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Success Story Template</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Webinar Slides</a></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>White-Labeled Materials</CardTitle>
                <CardDescription>Customizable materials for your brand</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Client Brochure Template</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Email Newsletter Template</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Social Media Post Templates</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Press Release Template</a></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Sales Enablement</CardTitle>
                <CardDescription>Materials to support your sales team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Sales Presentation Deck</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Objection Handling Guide</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Competitive Analysis</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Value Proposition Guide</a></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Digital Assets</CardTitle>
                <CardDescription>Digital marketing materials and assets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Website Banners</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Social Media Graphics</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Email Templates</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Video Assets</a></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Event Materials</CardTitle>
                <CardDescription>Materials for partner events and webinars</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><a href="#" className="text-blue-600 hover:underline">Event Registration Template</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Webinar Invitation</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Event Follow-up Email</a></div>
                <div><a href="#" className="text-blue-600 hover:underline">Presentation Templates</a></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Popular Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <a href="#" className="text-blue-600 hover:underline font-medium">Platform Quick Start Guide</a>
              <p className="text-sm text-muted-foreground">Most downloaded resource</p>
            </div>
            <div>
              <a href="#" className="text-blue-600 hover:underline font-medium">Lead Conversion Best Practices</a>
              <p className="text-sm text-muted-foreground">Top-rated guide</p>
            </div>
            <div>
              <a href="#" className="text-blue-600 hover:underline font-medium">API Integration Guide</a>
              <p className="text-sm text-muted-foreground">Technical implementation guide</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>Can't find what you're looking for? Our support team is here to help.</p>
            <Button asChild className="w-full">
              <Link href="/partner/support">Contact Support</Link>
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              or email us at <a href="mailto:support@insuranceleadgen.ai" className="text-blue-600">support@insuranceleadgen.ai</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}