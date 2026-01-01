import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function PartnerCommunity() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Partner Community</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Community Forum</CardTitle>
            <CardDescription>Connect with other partners, share insights, and get help</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="font-semibold">Welcome to the Partner Community!</h3>
                <p className="text-sm text-muted-foreground">This is a space for partners to collaborate, share best practices, and support each other.</p>
              </div>
              
              <div className="border-b pb-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">Best Practices for Lead Conversion</h3>
                    <p className="text-sm text-muted-foreground">Started by: Sarah Johnson • 2 days ago</p>
                  </div>
                  <span className="text-sm text-muted-foreground">8 replies</span>
                </div>
                <p className="text-sm mb-2">Looking for tips on improving lead conversion rates. What strategies have worked best for your agency?</p>
                <Button variant="outline" size="sm">View Discussion</Button>
              </div>
              
              <div className="border-b pb-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">CRM Integration Tips</h3>
                    <p className="text-sm text-muted-foreground">Started by: Mike Chen • 1 week ago</p>
                  </div>
                  <span className="text-sm text-muted-foreground">12 replies</span>
                </div>
                <p className="text-sm mb-2">Has anyone successfully integrated with HubSpot? Looking for configuration tips and best practices.</p>
                <Button variant="outline" size="sm">View Discussion</Button>
              </div>
              
              <div className="border-b pb-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">New Feature Announcement</h3>
                    <p className="text-sm text-muted-foreground">Started by: Admin • 3 days ago</p>
                  </div>
                  <span className="text-sm text-muted-foreground">5 replies</span>
                </div>
                <p className="text-sm mb-2">Exciting news! We've just released the new AI-powered lead scoring feature. Check it out and share your feedback!</p>
                <Button variant="outline" size="sm">View Discussion</Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Start New Discussion</Button>
          </CardFooter>
        </Card>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Community Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h3 className="font-semibold">Be Respectful</h3>
                <p>Treat all members with courtesy and professionalism.</p>
              </div>
              <div>
                <h3 className="font-semibold">Share Knowledge</h3>
                <p>Contribute your expertise and help others succeed.</p>
              </div>
              <div>
                <h3 className="font-semibold">Stay On Topic</h3>
                <p>Keep discussions relevant to the platform and industry.</p>
              </div>
              <div>
                <h3 className="font-semibold">No Solicitation</h3>
                <p>Avoid promotional content or spam.</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Community Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-center">
              <div>
                <div className="text-2xl font-bold">148</div>
                <div className="text-sm text-muted-foreground">Active Members</div>
              </div>
              <div>
                <div className="text-2xl font-bold">42</div>
                <div className="text-sm text-muted-foreground">Ongoing Discussions</div>
              </div>
              <div>
                <div className="text-2xl font-bold">89%</div>
                <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Partner networking and learning opportunities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="font-semibold">Monthly Partner Webinar</h3>
              <p className="text-sm text-muted-foreground">February 15, 2024 • 2:00 PM EST</p>
              <p className="text-sm">Topic: Advanced Lead Management Strategies</p>
              <Button variant="outline" size="sm" className="mt-2">Register</Button>
            </div>
            <div className="border-b pb-2">
              <h3 className="font-semibold">Integration Workshop</h3>
              <p className="text-sm text-muted-foreground">February 22, 2024 • 11:00 AM EST</p>
              <p className="text-sm">Hands-on session for technical users</p>
              <Button variant="outline" size="sm" className="mt-2">Register</Button>
            </div>
            <div>
              <h3 className="font-semibold">Annual Partner Conference</h3>
              <p className="text-sm text-muted-foreground">June 5-7, 2024 • Miami, FL</p>
              <p className="text-sm">Networking, training, and keynote sessions</p>
              <Button variant="outline" size="sm" className="mt-2">Learn More</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Partner Success Stories</CardTitle>
            <CardDescription>Learn from top-performing partners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">ABC Insurance: 200% Growth in 6 Months</h3>
              <p className="text-sm text-muted-foreground">How ABC Insurance leveraged our platform to double their business</p>
              <Button variant="outline" size="sm" className="mt-2">Read Case Study</Button>
            </div>
            <div>
              <h3 className="font-semibold">XYZ Brokerage: 95% Conversion Rate</h3>
              <p className="text-sm text-muted-foreground">Strategies for achieving industry-leading conversion rates</p>
              <Button variant="outline" size="sm" className="mt-2">Read Case Study</Button>
            </div>
            <div>
              <h3 className="font-semibold">Acme Agency: Seamless Integration</h3>
              <p className="text-sm text-muted-foreground">Best practices for CRM and system integration</p>
              <Button variant="outline" size="sm" className="mt-2">Read Case Study</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Start a New Discussion</CardTitle>
          <CardDescription>Share your questions, insights, or experiences</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input placeholder="Enter discussion title" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select className="w-full p-2 border rounded">
                <option>General Discussion</option>
                <option>Best Practices</option>
                <option>Technical Help</option>
                <option>Integration</option>
                <option>Training</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <Textarea 
                placeholder="Share your question or insight..."
                rows={5}
                required
              />
            </div>
            <Button type="submit">Post Discussion</Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Peer Learning Groups</CardTitle>
            <CardDescription>Join specialized discussion groups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold">Agency Owners Group</h3>
              <p className="text-sm text-muted-foreground">For agency principals and decision makers</p>
              <Button variant="outline" size="sm">Join Group</Button>
            </div>
            <div>
              <h3 className="font-semibold">Technical Users Group</h3>
              <p className="text-sm text-muted-foreground">For IT staff and technical implementers</p>
              <Button variant="outline" size="sm">Join Group</Button>
            </div>
            <div>
              <h3 className="font-semibold">Marketing Specialists</h3>
              <p className="text-sm text-muted-foreground">For marketing and lead generation professionals</p>
              <Button variant="outline" size="sm">Join Group</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Community Resources</CardTitle>
            <CardDescription>Additional community benefits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold">Knowledge Base</h3>
              <p className="text-sm text-muted-foreground">Searchable database of community solutions</p>
              <Button variant="outline" size="sm">Browse Knowledge Base</Button>
            </div>
            <div>
              <h3 className="font-semibold">Partner Directory</h3>
              <p className="text-sm text-muted-foreground">Connect with other certified partners</p>
              <Button variant="outline" size="sm">View Directory</Button>
            </div>
            <div>
              <h3 className="font-semibold">Best Practice Library</h3>
              <p className="text-sm text-muted-foreground">Curated collection of proven strategies</p>
              <Button variant="outline" size="sm">Explore Library</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="text-center mt-6">
        <Button variant="outline">
          <Link href="/partner">Back to Partner Portal</Link>
        </Button>
      </div>
    </div>
  );
}