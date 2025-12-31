"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { FileDown, Calendar, Clock, CheckCircle, XCircle, Loader } from "lucide-react";
import { reportsService } from "@/services/reports.service";
import type { Report, ReportType, ExportFormat } from "@/types/reports";

function ReportsContent() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Generate report form state
  const [reportName, setReportName] = useState("");
  const [reportType, setReportType] = useState<ReportType>("lead_performance");
  const [reportFormat, setReportFormat] = useState<ExportFormat>("pdf");
  const [description, setDescription] = useState("");

  const reportTypeOptions = [
    { value: "lead_performance", label: "Lead Performance" },
    { value: "agent_performance", label: "Agent Performance" },
    { value: "conversion_funnel", label: "Conversion Funnel" },
    { value: "revenue", label: "Revenue Report" },
    { value: "ai_model_performance", label: "AI Model Performance" },
    { value: "system_health", label: "System Health" },
    { value: "custom", label: "Custom Report" },
  ];

  const formatOptions = [
    { value: "pdf", label: "PDF" },
    { value: "csv", label: "CSV" },
    { value: "excel", label: "Excel" },
    { value: "json", label: "JSON" },
  ];

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const result = await reportsService.listReports({ limit: 50 });
      setReports(result.reports);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!reportName.trim()) {
      alert("Please enter a report name");
      return;
    }

    try {
      setGenerating(true);
      await reportsService.generateReport({
        name: reportName,
        description: description || undefined,
        type: reportType,
        format: reportFormat,
      });

      // Reset form and close modal
      setReportName("");
      setDescription("");
      setReportType("lead_performance");
      setReportFormat("pdf");
      setIsGenerateModalOpen(false);

      // Reload reports
      await loadReports();
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      const blob = await reportsService.downloadReport(report.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.name}.${report.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report. Please try again.");
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      await reportsService.deleteReport(reportId);
      await loadReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      alert("Failed to delete report. Please try again.");
    }
  };

  const getStatusIcon = (status: Report["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-error-600" />;
      case "processing":
        return <Loader className="h-5 w-5 text-warning-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-secondary-400" />;
    }
  };

  const getStatusBadge = (status: Report["status"]) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case "completed":
        return <span className={`${baseClasses} bg-success-100 text-success-700`}>Completed</span>;
      case "failed":
        return <span className={`${baseClasses} bg-error-100 text-error-700`}>Failed</span>;
      case "processing":
        return <span className={`${baseClasses} bg-warning-100 text-warning-700`}>Processing</span>;
      default:
        return <span className={`${baseClasses} bg-secondary-100 text-secondary-700`}>Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Reports</h2>
          <p className="text-secondary-600">Generate and manage performance reports</p>
        </div>
        <Button data-tour="reports-generate" onClick={() => setIsGenerateModalOpen(true)}>
          <FileDown className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>View and download your generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-secondary-200 animate-pulse rounded" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileDown className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">No reports yet</h3>
              <p className="text-secondary-600 mb-4">
                Generate your first report to see it here
              </p>
              <Button onClick={() => setIsGenerateModalOpen(true)}>Generate Report</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(report.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-secondary-900">{report.name}</h4>
                        {getStatusBadge(report.status)}
                      </div>
                      {report.description && (
                        <p className="text-sm text-secondary-600 mb-1">{report.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-secondary-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                        <span className="uppercase">{report.format}</span>
                        <span className="capitalize">{report.type.replace("_", " ")}</span>
                      </div>
                      {report.error && (
                        <p className="text-sm text-error-600 mt-1">Error: {report.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.status === "completed" && report.fileUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(report)}
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(report.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Report Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => !generating && setIsGenerateModalOpen(false)}
        title="Generate Report"
      >
        <div className="space-y-4">
          <Input
            label="Report Name"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            placeholder="e.g., Monthly Performance Report"
            required
          />

          <Input
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the report"
          />

          <Select
            label="Report Type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            options={reportTypeOptions}
          />

          <Select
            label="Export Format"
            value={reportFormat}
            onChange={(e) => setReportFormat(e.target.value as ExportFormat)}
            options={formatOptions}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsGenerateModalOpen(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button onClick={handleGenerateReport} disabled={generating}>
              {generating ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout title="Reports">
        <ReportsContent />
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
