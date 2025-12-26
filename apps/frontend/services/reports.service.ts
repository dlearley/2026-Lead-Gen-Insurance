import apiClient from "@/lib/api-client";
import type {
  Report,
  ReportSchedule,
  CreateReportRequest,
  CreateScheduleRequest,
  Alert,
  CreateAlertRequest,
  ReportType,
  ExportFormat,
} from "@/types/reports";

class ReportsService {
  /**
   * Generate a new report
   */
  async generateReport(data: CreateReportRequest): Promise<Report> {
    return apiClient.post<Report>("/api/v1/reports/generate", data);
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<Report> {
    return apiClient.get<Report>(`/api/v1/reports/${reportId}`);
  }

  /**
   * List all reports
   */
  async listReports(params?: {
    type?: ReportType;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reports: Report[]; total: number }> {
    return apiClient.get("/api/v1/reports", { params });
  }

  /**
   * Download report file
   */
  async downloadReport(reportId: string): Promise<Blob> {
    return apiClient.get<Blob>(`/api/v1/reports/${reportId}/download`, {
      responseType: "blob",
    });
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<void> {
    return apiClient.delete(`/api/v1/reports/${reportId}`);
  }

  /**
   * Export data in specific format
   */
  async exportData(
    type: ReportType,
    format: ExportFormat,
    parameters?: Record<string, unknown>
  ): Promise<Blob> {
    return apiClient.post<Blob>(
      "/api/v1/reports/export",
      { type, format, parameters },
      { responseType: "blob" }
    );
  }

  // Report Schedules

  /**
   * Create a new report schedule
   */
  async createSchedule(data: CreateScheduleRequest): Promise<ReportSchedule> {
    return apiClient.post<ReportSchedule>("/api/v1/reports/schedules", data);
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<ReportSchedule> {
    return apiClient.get<ReportSchedule>(`/api/v1/reports/schedules/${scheduleId}`);
  }

  /**
   * List all schedules
   */
  async listSchedules(): Promise<ReportSchedule[]> {
    return apiClient.get("/api/v1/reports/schedules");
  }

  /**
   * Update a schedule
   */
  async updateSchedule(
    scheduleId: string,
    data: Partial<CreateScheduleRequest>
  ): Promise<ReportSchedule> {
    return apiClient.put<ReportSchedule>(`/api/v1/reports/schedules/${scheduleId}`, data);
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    return apiClient.delete(`/api/v1/reports/schedules/${scheduleId}`);
  }

  /**
   * Toggle schedule enabled status
   */
  async toggleSchedule(scheduleId: string, enabled: boolean): Promise<ReportSchedule> {
    return apiClient.patch<ReportSchedule>(`/api/v1/reports/schedules/${scheduleId}`, {
      enabled,
    });
  }

  // Alerts

  /**
   * Create a new alert
   */
  async createAlert(data: CreateAlertRequest): Promise<Alert> {
    return apiClient.post<Alert>("/api/v1/alerts", data);
  }

  /**
   * Get alert by ID
   */
  async getAlert(alertId: string): Promise<Alert> {
    return apiClient.get<Alert>(`/api/v1/alerts/${alertId}`);
  }

  /**
   * List all alerts
   */
  async listAlerts(): Promise<Alert[]> {
    return apiClient.get("/api/v1/alerts");
  }

  /**
   * Update an alert
   */
  async updateAlert(alertId: string, data: Partial<CreateAlertRequest>): Promise<Alert> {
    return apiClient.put<Alert>(`/api/v1/alerts/${alertId}`, data);
  }

  /**
   * Delete an alert
   */
  async deleteAlert(alertId: string): Promise<void> {
    return apiClient.delete(`/api/v1/alerts/${alertId}`);
  }

  /**
   * Toggle alert enabled status
   */
  async toggleAlert(alertId: string, enabled: boolean): Promise<Alert> {
    return apiClient.patch<Alert>(`/api/v1/alerts/${alertId}`, { enabled });
  }
}

export const reportsService = new ReportsService();
