"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Shield,
  Activity,
  UserCheck,
  UserX,
  Crown,
  Star
} from "lucide-react";

function UsersContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const users = [
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1 (555) 123-4567",
      role: "admin",
      status: "active",
      avatar: "JD",
      joinedAt: "2024-01-15T10:30:00Z",
      lastActive: "2024-01-20T14:22:00Z",
      permissions: ["all"],
      performance: 98
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane.smith@example.com",
      phone: "+1 (555) 234-5678",
      role: "manager",
      status: "active",
      avatar: "JS",
      joinedAt: "2024-01-10T09:15:00Z",
      lastActive: "2024-01-20T16:45:00Z",
      permissions: ["leads", "reports"],
      performance: 92
    },
    {
      id: "3",
      name: "Bob Johnson",
      email: "bob.johnson@example.com",
      phone: "+1 (555) 345-6789",
      role: "agent",
      status: "active",
      avatar: "BJ",
      joinedAt: "2024-01-08T11:30:00Z",
      lastActive: "2024-01-20T12:15:00Z",
      permissions: ["leads"],
      performance: 87
    },
    {
      id: "4",
      name: "Alice Brown",
      email: "alice.brown@example.com",
      phone: "+1 (555) 456-7890",
      role: "agent",
      status: "inactive",
      avatar: "AB",
      joinedAt: "2024-01-05T14:20:00Z",
      lastActive: "2024-01-18T10:30:00Z",
      permissions: ["leads"],
      performance: 95
    },
    {
      id: "5",
      name: "Charlie Wilson",
      email: "charlie.wilson@example.com",
      phone: "+1 (555) 567-8901",
      role: "viewer",
      status: "pending",
      avatar: "CW",
      joinedAt: "2024-01-20T08:00:00Z",
      lastActive: null,
      permissions: ["read"],
      performance: null
    }
  ];

  const roles = [
    { value: "all", label: "All Roles" },
    { value: "admin", label: "Administrator" },
    { value: "manager", label: "Manager" },
    { value: "agent", label: "Agent" },
    { value: "viewer", label: "Viewer" }
  ];

  const statuses = [
    { value: "all", label: "All Statuses" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" },
    { value: "suspended", label: "Suspended" }
  ];

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: "bg-purple-100 text-purple-800",
      manager: "bg-blue-100 text-blue-800",
      agent: "bg-green-100 text-green-800",
      viewer: "bg-gray-100 text-gray-800"
    };
    return badges[role as keyof typeof badges] || badges.viewer;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
      suspended: "bg-orange-100 text-orange-800"
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4" />;
      case "manager":
        return <Shield className="h-4 w-4" />;
      case "agent":
        return <UserCheck className="h-4 w-4" />;
      case "viewer":
        return <Activity className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    const matchesStatus = selectedStatus === "all" || user.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeUsers = users.filter(u => u.status === "active").length;
  const totalUsers = users.length;
  const avgPerformance = users.filter(u => u.performance).reduce((acc, u) => acc + (u.performance || 0), 0) / users.filter(u => u.performance).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Users</h2>
          <p className="text-secondary-600">Manage team members and their permissions</p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Total Users</p>
                <p className="text-2xl font-bold text-secondary-900">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Active Users</p>
                <p className="text-2xl font-bold text-secondary-900">{activeUsers}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Pending Users</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {users.filter(u => u.status === "pending").length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Avg Performance</p>
                <p className="text-2xl font-bold text-secondary-900">{avgPerformance.toFixed(1)}%</p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="pl-10 w-64"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-secondary-400" />
              </div>
              
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                options={roles}
                className="w-48"
              />
              
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={statuses}
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
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Display */}
      {viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                      {user.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-secondary-900">{user.name}</h3>
                      <p className="text-sm text-secondary-600">{user.email}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="ml-1 capitalize">{user.role}</span>
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-secondary-600">
                    <span className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {user.email}
                    </span>
                  </div>
                  
                  {user.phone && (
                    <div className="flex items-center space-x-4 text-sm text-secondary-600">
                      <span className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {user.phone}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-secondary-600">
                    <span>Joined {new Date(user.joinedAt).toLocaleDateString()}</span>
                    {user.performance && (
                      <span className="flex items-center">
                        <Star className="h-4 w-4 mr-1 text-yellow-500" />
                        {user.performance}%
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-secondary-700">User</th>
                    <th className="text-left p-4 text-sm font-medium text-secondary-700">Role</th>
                    <th className="text-left p-4 text-sm font-medium text-secondary-700">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-secondary-700">Performance</th>
                    <th className="text-left p-4 text-sm font-medium text-secondary-700">Joined</th>
                    <th className="text-left p-4 text-sm font-medium text-secondary-700">Last Active</th>
                    <th className="text-left p-4 text-sm font-medium text-secondary-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t border-secondary-200">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-sm font-semibold">
                            {user.avatar}
                          </div>
                          <div>
                            <p className="font-medium text-secondary-900">{user.name}</p>
                            <p className="text-sm text-secondary-600">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span className="ml-1 capitalize">{user.role}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {user.performance ? (
                          <span className="flex items-center">
                            <Star className="h-4 w-4 mr-1 text-yellow-500" />
                            {user.performance}%
                          </span>
                        ) : (
                          <span className="text-secondary-400">N/A</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-secondary-600">
                        {new Date(user.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm text-secondary-600">
                        {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : "Never"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No users found</h3>
            <p className="text-secondary-600 mb-4">
              {searchQuery ? "Try adjusting your search terms or filters" : "Add your first user to get started"}
            </p>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Users">
        <UsersContent />
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}