"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Key,
  Mail,
  Phone,
  Globe,
  Save,
  AlertCircle,
  CheckCircle,
  Moon,
  Sun,
  Monitor
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

function SettingsContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: "",
    jobTitle: "",
    company: "",
    timezone: "UTC",
    language: "en"
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    leadAlerts: true,
    systemUpdates: true,
    weeklyReports: true,
    marketingEmails: false
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: "team",
    activityStatus: true,
    dataSharing: false,
    analytics: true
  });

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: "light",
    compactMode: false,
    showTours: true
  });

  const tabs = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { id: "privacy", label: "Privacy & Security", icon: <Shield className="h-4 w-4" /> },
    { id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
    { id: "api", label: "API & Integrations", icon: <Key className="h-4 w-4" /> },
    { id: "data", label: "Data & Export", icon: <Database className="h-4 w-4" /> }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveMessage("Settings saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveMessage("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
              />
              <Input
                label="Last Name"
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
              />
            </div>
            
            <Input
              label="Email Address"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            />
            
            <Input
              label="Phone Number"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Job Title"
                value={profileData.jobTitle}
                onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
              />
              <Input
                label="Company"
                value={profileData.company}
                onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Timezone
                </label>
                <select
                  value={profileData.timezone}
                  onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="EST">Eastern Time</option>
                  <option value="CST">Central Time</option>
                  <option value="MST">Mountain Time</option>
                  <option value="PST">Pacific Time</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Language
                </label>
                <select
                  value={profileData.language}
                  onChange={(e) => setProfileData({ ...profileData, language: e.target.value })}
                  className="w-full px-3 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-secondary-900 mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { key: "emailNotifications", label: "Email Notifications", description: "Receive notifications via email" },
                  { key: "smsNotifications", label: "SMS Notifications", description: "Receive urgent notifications via SMS" },
                  { key: "pushNotifications", label: "Push Notifications", description: "Receive browser push notifications" },
                  { key: "leadAlerts", label: "Lead Alerts", description: "Get notified about new leads and status changes" },
                  { key: "systemUpdates", label: "System Updates", description: "Receive updates about system maintenance and new features" },
                  { key: "weeklyReports", label: "Weekly Reports", description: "Get weekly performance summaries" },
                  { key: "marketingEmails", label: "Marketing Emails", description: "Receive product updates and marketing content" }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-secondary-900">{item.label}</h4>
                      <p className="text-sm text-secondary-600">{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof typeof notifications]}
                        onChange={(e) => setNotifications({
                          ...notifications,
                          [item.key]: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-secondary-900 mb-4">Privacy Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Profile Visibility
                  </label>
                  <select
                    value={privacy.profileVisibility}
                    onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="public">Public</option>
                    <option value="team">Team Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-secondary-900">Activity Status</h4>
                    <p className="text-sm text-secondary-600">Show when you're active in the platform</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacy.activityStatus}
                      onChange={(e) => setPrivacy({ ...privacy, activityStatus: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-secondary-900">Data Sharing</h4>
                    <p className="text-sm text-secondary-600">Share anonymized data for platform improvement</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacy.dataSharing}
                      onChange={(e) => setPrivacy({ ...privacy, dataSharing: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-secondary-900 mb-4">Theme & Display</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-3">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "light", label: "Light", icon: <Sun className="h-5 w-5" /> },
                      { value: "dark", label: "Dark", icon: <Moon className="h-5 w-5" /> },
                      { value: "system", label: "System", icon: <Monitor className="h-5 w-5" /> }
                    ].map((theme) => (
                      <button
                        key={theme.value}
                        onClick={() => setAppearance({ ...appearance, theme: theme.value })}
                        className={`p-3 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                          appearance.theme === theme.value
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-secondary-200 hover:border-secondary-300"
                        }`}
                      >
                        {theme.icon}
                        <span className="text-sm font-medium">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-secondary-900">Compact Mode</h4>
                    <p className="text-sm text-secondary-600">Use a more compact layout to show more content</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appearance.compactMode}
                      onChange={(e) => setAppearance({ ...appearance, compactMode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-secondary-900">Show Product Tours</h4>
                    <p className="text-sm text-secondary-600">Display onboarding tours for new features</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appearance.showTours}
                      onChange={(e) => setAppearance({ ...appearance, showTours: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case "api":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-secondary-900 mb-4">API Keys</h3>
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-secondary-900">Production API Key</h4>
                        <p className="text-sm text-secondary-600">Used for production integrations</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Regenerate</Button>
                        <Button variant="outline" size="sm">Copy</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-secondary-900">Development API Key</h4>
                        <p className="text-sm text-secondary-600">Used for testing and development</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Regenerate</Button>
                        <Button variant="outline" size="sm">Copy</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      case "data":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-secondary-900 mb-4">Data Export & Management</h3>
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-secondary-900 mb-2">Export Your Data</h4>
                    <p className="text-sm text-secondary-600 mb-4">
                      Download a copy of all your data in JSON format
                    </p>
                    <Button>Export Data</Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-secondary-900 mb-2">Account Deletion</h4>
                    <p className="text-sm text-secondary-600 mb-4">
                      Permanently delete your account and all associated data
                    </p>
                    <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                      Delete Account
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Settings</h2>
          <p className="text-secondary-600">Manage your account and application preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {saveMessage && (
        <Alert variant={saveMessage.includes("success") ? "success" : "error"}>
          <div className="flex items-center gap-2">
            {saveMessage.includes("success") ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{saveMessage}</span>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary-50 text-primary-700"
                    : "text-secondary-700 hover:bg-secondary-100"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>{tabs.find(tab => tab.id === activeTab)?.label}</span>
              </CardTitle>
              <CardDescription>
                {activeTab === "profile" && "Update your personal information and preferences"}
                {activeTab === "notifications" && "Configure how and when you receive notifications"}
                {activeTab === "privacy" && "Control your privacy and data sharing settings"}
                {activeTab === "appearance" && "Customize the look and feel of the platform"}
                {activeTab === "api" && "Manage API keys and integration settings"}
                {activeTab === "data" && "Export your data or manage your account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTabContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Settings">
        <SettingsContent />
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}