import { logger } from '@insurance-lead-gen/core';
import type { ReportData, ReportFormat } from '@insurance-lead-gen/types';

export class ReportExporter {
  async export(report: ReportData, format: ReportFormat): Promise<Buffer> {
    logger.info('Exporting report', { title: report.title, format });

    switch (format) {
      case 'json':
        return this.exportJSON(report);
      case 'csv':
        return this.exportCSV(report);
      case 'pdf':
        return this.exportPDF(report);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportJSON(report: ReportData): Buffer {
    const json = JSON.stringify(report, null, 2);
    return Buffer.from(json, 'utf-8');
  }

  private exportCSV(report: ReportData): Buffer {
    const lines: string[] = [];

    lines.push(`"${report.title}"`);
    lines.push(`"Generated At","${report.generatedAt.toISOString()}"`);
    lines.push(
      `"Date Range","${report.dateRange.from.toISOString()} to ${report.dateRange.to.toISOString()}"`,
    );
    lines.push('');

    lines.push('"Summary"');
    Object.entries(report.summary).forEach(([key, value]) => {
      lines.push(`"${key}","${this.formatValue(value)}"`);
    });
    lines.push('');

    report.sections.forEach((section) => {
      lines.push(`"${section.title}"`);
      if (section.description) {
        lines.push(`"${section.description}"`);
      }

      if (Array.isArray(section.data)) {
        const data = section.data as Record<string, unknown>[];
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          lines.push(headers.map((h) => `"${h}"`).join(','));

          data.forEach((row) => {
            const values = headers.map((h) => `"${this.formatValue(row[h])}"`);
            lines.push(values.join(','));
          });
        }
      } else if (typeof section.data === 'object' && section.data !== null) {
        Object.entries(section.data).forEach(([key, value]) => {
          lines.push(`"${key}","${this.formatValue(value)}"`);
        });
      }

      lines.push('');
    });

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  private exportPDF(report: ReportData): Buffer {
    const html = this.generateHTML(report);
    return Buffer.from(html, 'utf-8');
  }

  private generateHTML(report: ReportData): string {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHTML(report.title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
      border-bottom: 1px solid #bdc3c7;
      padding-bottom: 5px;
    }
    .metadata {
      background-color: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .summary {
      background-color: #e8f5e9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
    }
    th {
      background-color: #3498db;
      color: white;
      padding: 12px;
      text-align: left;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .section {
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <h1>${this.escapeHTML(report.title)}</h1>
  
  <div class="metadata">
    <p><strong>Generated At:</strong> ${report.generatedAt.toLocaleString()}</p>
    <p><strong>Date Range:</strong> ${report.dateRange.from.toLocaleDateString()} - ${report.dateRange.to.toLocaleDateString()}</p>
  </div>
  
  <div class="summary">
    <h2>Summary</h2>
    ${this.renderObject(report.summary)}
  </div>
`;

    report.sections.forEach((section) => {
      html += `
  <div class="section">
    <h2>${this.escapeHTML(section.title)}</h2>
    ${section.description ? `<p>${this.escapeHTML(section.description)}</p>` : ''}
    ${this.renderData(section.data)}
  </div>
`;
    });

    html += `
</body>
</html>
`;

    return html;
  }

  private renderObject(obj: Record<string, unknown>): string {
    let html = '<table>';
    Object.entries(obj).forEach(([key, value]) => {
      html += `<tr><th>${this.escapeHTML(key)}</th><td>${this.escapeHTML(this.formatValue(value))}</td></tr>`;
    });
    html += '</table>';
    return html;
  }

  private renderData(data: unknown): string {
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return '<p>No data available</p>';
      }

      if (typeof data[0] === 'object' && data[0] !== null) {
        const headers = Object.keys(data[0] as Record<string, unknown>);
        let html = '<table><thead><tr>';
        headers.forEach((header) => {
          html += `<th>${this.escapeHTML(header)}</th>`;
        });
        html += '</tr></thead><tbody>';

        data.forEach((row) => {
          html += '<tr>';
          headers.forEach((header) => {
            const value = (row as Record<string, unknown>)[header];
            html += `<td>${this.escapeHTML(this.formatValue(value))}</td>`;
          });
          html += '</tr>';
        });

        html += '</tbody></table>';
        return html;
      }

      let html = '<ul>';
      data.forEach((item) => {
        html += `<li>${this.escapeHTML(this.formatValue(item))}</li>`;
      });
      html += '</ul>';
      return html;
    }

    if (typeof data === 'object' && data !== null) {
      return this.renderObject(data as Record<string, unknown>);
    }

    return `<p>${this.escapeHTML(this.formatValue(data))}</p>`;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private escapeHTML(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return String(text).replace(/[&<>"']/g, (char) => map[char]);
  }
}
