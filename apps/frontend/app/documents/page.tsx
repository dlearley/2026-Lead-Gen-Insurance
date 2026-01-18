"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { 
  FileText, 
  Upload, 
  Search, 
  Filter,
  Download,
  Eye,
  Trash2,
  Share2,
  FolderOpen,
  FileImage,
  FilePdf,
  FileSpreadsheet,
  File
} from "lucide-react";

function DocumentsContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const documents = [
    {
      id: "1",
      name: "Insurance Policy Document.pdf",
      type: "pdf",
      size: "2.4 MB",
      uploadedAt: "2024-01-15T10:30:00Z",
      uploadedBy: "John Doe",
      folder: "Policies",
      status: "verified",
      tags: ["policy", "auto", "contract"]
    },
    {
      id: "2", 
      name: "Customer Claims Report.xlsx",
      type: "spreadsheet",
      size: "1.8 MB",
      uploadedAt: "2024-01-14T14:22:00Z",
      uploadedBy: "Jane Smith",
      folder: "Claims",
      status: "pending",
      tags: ["claims", "report", "monthly"]
    },
    {
      id: "3",
      name: "Marketing Brochure.pdf", 
      type: "pdf",
      size: "856 KB",
      uploadedAt: "2024-01-13T09:15:00Z",
      uploadedBy: "Marketing Team",
      folder: "Marketing",
      status: "verified",
      tags: ["marketing", "brochure", "promotional"]
    },
    {
      id: "4",
      name: "Lead Photos.zip",
      type: "archive",
      size: "12.3 MB", 
      uploadedAt: "2024-01-12T16:45:00Z",
      uploadedBy: "Bob Johnson",
      folder: "Leads",
      status: "verified",
      tags: ["photos", "leads", "evidence"]
    },
    {
      id: "5",
      name: "Agent Training Manual.pdf",
      type: "pdf",
      size: "4.7 MB",
      uploadedAt: "2024-01-11T11:30:00Z", 
      uploadedBy: "Training Dept",
      folder: "Training",
      status: "verified",
      tags: ["training", "manual", "agents"]
    }
  ];

  const folders = [
    { id: "all", name: "All Documents", count: documents.length },
    { id: "Policies", name: "Policies", count: 1 },
    { id: "Claims", name: "Claims", count: 1 },
    { id: "Marketing", name: "Marketing", count: 1 },
    { id: "Leads", name: "Leads", count: 1 },
    { id: "Training", name: "Training", count: 1 }
  ];

  const filters = [
    { value: "all", label: "All Documents" },
    { value: "pdf", label: "PDF Documents" },
    { value: "spreadsheet", label: "Spreadsheets" },
    { value: "image", label: "Images" },
    { value: "verified", label: "Verified" },
    { value: "pending", label: "Pending Review" }
  ];

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FilePdf className="h-8 w-8 text-red-500" />;
      case "spreadsheet":
        return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
      case "image":
        return <FileImage className="h-8 w-8 text-blue-500" />;
      case "archive":
        return <FolderOpen className="h-8 w-8 text-yellow-500" />;
      default:
        return <File className="h-8 w-8 text-secondary-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      verified: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800", 
      rejected: "bg-red-100 text-red-800"
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = selectedFilter === "all" || doc.type === selectedFilter || doc.status === selectedFilter;
    const matchesFolder = selectedFolder === "all" || doc.folder === selectedFolder;
    return matchesSearch && matchesFilter && matchesFolder;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Documents</h2>
          <p className="text-secondary-600">Manage and organize your files</p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Documents
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Total Documents</p>
                <p className="text-2xl font-bold text-secondary-900">{documents.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Total Size</p>
                <p className="text-2xl font-bold text-secondary-900">21.2 MB</p>
              </div>
              <Upload className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Verified</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {documents.filter(d => d.status === "verified").length}
                </p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Pending Review</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {documents.filter(d => d.status === "pending").length}
                </p>
              </div>
              <Filter className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="pl-10 w-64"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-secondary-400" />
              </div>
              
              <Select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                options={filters}
                className="w-48"
              />
              
              <Select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                options={folders.map(f => ({ value: f.id, label: `${f.name} (${f.count})` }))}
                className="w-48"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Display */}
      <div className={viewMode === "grid" ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
        {filteredDocuments.map((document) => (
          <Card key={document.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              {viewMode === "grid" ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(document.type)}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-secondary-900 truncate">{document.name}</h3>
                        <p className="text-sm text-secondary-600">{document.size}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(document.status)}`}>
                      {document.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {document.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 text-xs bg-secondary-100 text-secondary-700 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-secondary-600">
                    <span>{document.uploadedBy}</span>
                    <span>{new Date(document.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  {getFileIcon(document.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-secondary-900">{document.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(document.status)}`}>
                        {document.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-secondary-600">
                      <span>{document.size}</span>
                      <span>{document.folder}</span>
                      <span>{document.uploadedBy}</span>
                      <span>{new Date(document.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No documents found</h3>
            <p className="text-secondary-600 mb-4">
              {searchQuery ? "Try adjusting your search terms or filters" : "Upload your first document to get started"}
            </p>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Documents
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Documents">
        <DocumentsContent />
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}