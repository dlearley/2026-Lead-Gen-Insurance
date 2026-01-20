"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Book, 
  MessageCircle, 
  Video, 
  FileText, 
  Search, 
  ChevronRight,
  ExternalLink,
  Star,
  Clock,
  Users,
  Zap,
  Shield,
  Headphones
} from "lucide-react";

function HelpCenterContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const helpCategories = [
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Learn the basics of using the platform",
      icon: <Zap className="h-6 w-6" />,
      articles: 12,
      color: "bg-blue-500"
    },
    {
      id: "leads",
      title: "Lead Management",
      description: "Everything about managing and tracking leads",
      icon: <Users className="h-6 w-6" />,
      articles: 18,
      color: "bg-green-500"
    },
    {
      id: "analytics",
      title: "Analytics & Reports",
      description: "Understanding your data and generating reports",
      icon: <FileText className="h-6 w-6" />,
      articles: 15,
      color: "bg-purple-500"
    },
    {
      id: "integration",
      title: "Integrations",
      description: "Connect with external tools and services",
      icon: <ExternalLink className="h-6 w-6" />,
      articles: 8,
      color: "bg-yellow-500"
    },
    {
      id: "security",
      title: "Security & Privacy",
      description: "Data protection and account security",
      icon: <Shield className="h-6 w-6" />,
      articles: 6,
      color: "bg-red-500"
    },
    {
      id: "support",
      title: "Support",
      description: "Get help when you need it",
      icon: <Headphones className="h-6 w-6" />,
      articles: 10,
      color: "bg-indigo-500"
    }
  ];

  const featuredArticles = [
    {
      id: 1,
      title: "How to Create Your First Lead",
      description: "Step-by-step guide to adding and managing leads",
      category: "getting-started",
      readTime: "5 min read",
      views: 1245,
      rating: 4.8,
      popular: true
    },
    {
      id: 2,
      title: "Understanding Lead Scoring",
      description: "Learn how AI-powered lead scoring works",
      category: "leads",
      readTime: "8 min read",
      views: 892,
      rating: 4.9,
      popular: true
    },
    {
      id: 3,
      title: "Setting Up Automated Workflows",
      description: "Automate your lead processing pipeline",
      category: "analytics",
      readTime: "12 min read",
      views: 567,
      rating: 4.7,
      popular: false
    },
    {
      id: 4,
      title: "Integrating with CRM Systems",
      description: "Connect your existing CRM with our platform",
      category: "integration",
      readTime: "10 min read",
      views: 423,
      rating: 4.6,
      popular: false
    }
  ];

  const quickLinks = [
    { title: "Video Tutorials", description: "Watch step-by-step tutorials", icon: <Video className="h-5 w-5" /> },
    { title: "API Documentation", description: "Technical integration guides", icon: <FileText className="h-5 w-5" /> },
    { title: "Contact Support", description: "Get help from our team", icon: <MessageCircle className="h-5 w-5" /> },
    { title: "Community Forum", description: "Connect with other users", icon: <Users className="h-5 w-5" /> }
  ];

  const filteredArticles = featuredArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <Book className="h-8 w-8 text-primary-600" />
        </div>
        <h1 className="text-3xl font-bold text-secondary-900">Help Center</h1>
        <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
          Find answers, learn best practices, and get the most out of the Insurance Leads platform
        </p>
        
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mt-8">
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help articles, guides, and tutorials..."
              className="pl-12 h-12 text-base"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-secondary-400" />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                  {link.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-secondary-900">{link.title}</h3>
                  <p className="text-sm text-secondary-600 mt-1">{link.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-2xl font-bold text-secondary-900 mb-6">Browse by Category</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {helpCategories.map((category) => (
            <Card key={category.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${category.color} text-white`}>
                    {category.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-secondary-900">{category.title}</h3>
                    <p className="text-sm text-secondary-600 mt-1">{category.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-secondary-500">{category.articles} articles</span>
                      <ChevronRight className="h-4 w-4 text-secondary-400" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Featured Articles */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-secondary-900">Featured Articles</h2>
          <div className="flex items-center space-x-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-secondary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              <option value="getting-started">Getting Started</option>
              <option value="leads">Lead Management</option>
              <option value="analytics">Analytics & Reports</option>
              <option value="integration">Integrations</option>
              <option value="security">Security & Privacy</option>
              <option value="support">Support</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-secondary-900 hover:text-primary-600">
                        {article.title}
                      </h3>
                      {article.popular && (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-secondary-600 mb-4">{article.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-secondary-500">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {article.readTime}
                      </span>
                      <span>{article.views} views</span>
                      <span className="flex items-center">
                        <Star className="h-3 w-3 mr-1 text-yellow-500" />
                        {article.rating}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-secondary-400 flex-shrink-0 ml-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Support CTA */}
      <Card className="bg-primary-50 border-primary-200">
        <CardContent className="p-8 text-center">
          <MessageCircle className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-secondary-900 mb-2">Still need help?</h3>
          <p className="text-secondary-600 mb-6 max-w-2xl mx-auto">
            Can't find what you're looking for? Our support team is here to help you succeed with the platform.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Button>
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
            <Button variant="outline">
              <Video className="h-4 w-4 mr-2" />
              Schedule a Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function HelpCenterPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Help Center">
        <HelpCenterContent />
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}