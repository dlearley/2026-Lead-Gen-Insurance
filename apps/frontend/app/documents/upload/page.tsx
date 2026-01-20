"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { documentUploadSchema, type DocumentUploadValues } from "@/lib/validation/documents";

export default function DocumentUploadPage() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DocumentUploadValues>({
    resolver: zodResolver(documentUploadSchema),
  });

  const selectedFile = watch("file");

  const onSubmit = handleSubmit(async () => {
    setMessage(null);

    // Demo upload flow: wire this to backend storage when ready.
    await new Promise((resolve) => setTimeout(resolve, 300));

    setMessage({ type: "success", text: "Upload queued (demo). Connect this to backend storage." });
  });

  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Upload Document">
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>Upload a PDF or image.</CardDescription>
          </CardHeader>
          <CardContent>
            {message && <Alert variant={message.type} className="mb-4">{message.text}</Alert>}

            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                id="title"
                label="Title (optional)"
                placeholder="Policy PDF"
                error={errors.title?.message}
                disabled={isSubmitting}
                {...register("title")}
              />

              <Textarea
                id="description"
                label="Description (optional)"
                placeholder="Notes about this document..."
                error={errors.description?.message}
                disabled={isSubmitting}
                rows={3}
                {...register("description")}
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-secondary-700" htmlFor="file">
                  File
                </label>
                <input
                  id="file"
                  type="file"
                  accept="application/pdf,image/*"
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setValue("file", file, { shouldValidate: true });
                    }
                  }}
                />
                {errors.file?.message && <p className="text-sm text-error-600">{errors.file.message}</p>}
                {selectedFile && (
                  <p className="text-sm text-secondary-700">
                    Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </p>
                )}
              </div>

              <Button type="submit" variant="outline" isLoading={isSubmitting}>
                Upload
              </Button>
            </form>
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
