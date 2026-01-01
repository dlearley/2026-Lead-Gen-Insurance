import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

export default function PartnerBilling() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Billing & Contracts</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>Your active subscription plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Premium Partner Plan</h3>
                <p className="text-sm text-muted-foreground">Annual subscription • Auto-renewal enabled</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Subscription ID</p>
                  <p className="font-medium">SUB-100456</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium text-green-600">Active</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">January 1, 2024</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Renewal Date</p>
                  <p className="font-medium">January 1, 2025</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Plan Features</h3>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Up to 50 active users</li>
                  <li>• Advanced reporting and analytics</li>
                  <li>• Priority support (2-hour response)</li>
                  <li>• API access and webhooks</li>
                  <li>• Custom branding and white-labeling</li>
                  <li>• Training and certification programs</li>
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline">Upgrade Plan</Button>
            <Button variant="outline">Manage Payment</Button>
            <Button variant="outline">Cancel Subscription</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Account Balance</p>
              <p className="text-2xl font-bold">$0.00</p>
              <p className="text-sm text-green-600">Account is current</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Next Payment</p>
              <p className="font-medium">February 1, 2024</p>
              <p className="text-sm">$2,850.00</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-medium">Visa •••• 4242</p>
              <p className="text-sm text-muted-foreground">Expires 12/2026</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Your billing history</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>INV-2024-01-001</TableCell>
                <TableCell>January 1, 2024</TableCell>
                <TableCell>$2,850.00</TableCell>
                <TableCell className="text-green-600">Paid</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">Download</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>INV-2023-12-001</TableCell>
                <TableCell>December 1, 2023</TableCell>
                <TableCell>$2,850.00</TableCell>
                <TableCell className="text-green-600">Paid</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">Download</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>INV-2023-11-001</TableCell>
                <TableCell>November 1, 2023</TableCell>
                <TableCell>$2,500.00</TableCell>
                <TableCell className="text-green-600">Paid</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">Download</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Usage Metrics</CardTitle>
            <CardDescription>Track your platform utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-xl font-bold">18/50</p>
                  <p className="text-sm text-green-600">36% utilization</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">API Calls</p>
                  <p className="text-xl font-bold">12,487/50,000</p>
                  <p className="text-sm text-green-600">25% utilization</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Leads Processed</p>
                  <p className="text-xl font-bold">1,248/10,000</p>
                  <p className="text-sm text-green-600">12% utilization</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Storage Used</p>
                  <p className="text-xl font-bold">4.2/50 GB</p>
                  <p className="text-sm text-green-600">8% utilization</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Recent transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-b pb-2">
                <div className="flex justify-between">
                  <span className="font-medium">January 1, 2024</span>
                  <span className="text-green-600 font-medium">-$2,850.00</span>
                </div>
                <p className="text-sm text-muted-foreground">Premium Partner Plan - Annual Subscription</p>
                <p className="text-xs text-muted-foreground">Payment Method: Visa •••• 4242</p>
              </div>
              
              <div className="border-b pb-2">
                <div className="flex justify-between">
                  <span className="font-medium">December 1, 2023</span>
                  <span className="text-green-600 font-medium">-$2,850.00</span>
                </div>
                <p className="text-sm text-muted-foreground">Premium Partner Plan - Annual Subscription</p>
                <p className="text-xs text-muted-foreground">Payment Method: Visa •••• 4242</p>
              </div>
              
              <div>
                <div className="flex justify-between">
                  <span className="font-medium">November 1, 2023</span>
                  <span className="text-green-600 font-medium">-$2,500.00</span>
                </div>
                <p className="text-sm text-muted-foreground">Standard Partner Plan - Annual Subscription</p>
                <p className="text-xs text-muted-foreground">Payment Method: Visa •••• 1234</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Contract Information</CardTitle>
            <CardDescription>Your partnership agreement details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Contract ID</p>
                <p className="font-medium">CONTRACT-2024-00456</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Partnership Tier</p>
                <p className="font-medium">Premium</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Contract Term</p>
                <p className="font-medium">January 1, 2024 - December 31, 2024</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Renewal Terms</p>
                <p className="font-medium">Auto-renewal enabled (30-day notice required to cancel)</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Commission Rate</p>
                <p className="font-medium">15% on referred business</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">Download Contract</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Billing Preferences</CardTitle>
            <CardDescription>Manage your billing settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Payment Method</h3>
                <div className="border p-3 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Visa •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/2026</p>
                    </div>
                    <Button variant="outline" size="sm">Update</Button>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Billing Contact</h3>
                <div className="border p-3 rounded">
                  <p className="font-medium">John Smith</p>
                  <p className="text-sm text-muted-foreground">john.smith@agency.com</p>
                  <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Invoice Delivery</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="radio" name="invoice-delivery" id="email" checked className="w-4 h-4" />
                    <label htmlFor="email" className="text-sm">Email (john.smith@agency.com)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="invoice-delivery" id="portal" className="w-4 h-4" />
                    <label htmlFor="portal" className="text-sm">Portal Only</label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Support & Resources</CardTitle>
          <CardDescription>Get help with billing questions</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600">📞</span>
            </div>
            <h3 className="font-semibold mb-1">Billing Support</h3>
            <p className="text-sm text-muted-foreground mb-2">Get help with invoices and payments</p>
            <Button variant="outline" size="sm">Contact Billing</Button>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600">💳</span>
            </div>
            <h3 className="font-semibold mb-1">Payment Issues</h3>
            <p className="text-sm text-muted-foreground mb-2">Resolve payment problems</p>
            <Button variant="outline" size="sm">Payment Help</Button>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600">📄</span>
            </div>
            <h3 className="font-semibold mb-1">Billing FAQ</h3>
            <p className="text-sm text-muted-foreground mb-2">Common billing questions</p>
            <Button variant="outline" size="sm">View FAQ</Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center">
        <Button variant="outline">
          <Link href="/partner">Back to Partner Portal</Link>
        </Button>
      </div>
    </div>
  );
}