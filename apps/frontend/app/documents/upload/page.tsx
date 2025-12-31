"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function DocumentUploadPage() {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Upload Document">
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Upload a PDF or image. (Full document workflows can be added as integrations are finalized.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
              />
              {fileName && <p className="text-sm text-secondary-700">Selected: {fileName}</p>}
              <Button variant="outline" onClick={() => alert("Upload demo: wire this to backend storage when ready.")}> 
                Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
