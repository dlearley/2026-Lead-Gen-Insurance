import { randomUUID } from 'crypto';
import { type Document } from './regulatory-reporting.service-types.js';

export type BreachNotificationTemplate = {
  id: string;
  jurisdiction: string;
  subject: string;
  body: string;
  version: number;
};

const defaultTemplates: BreachNotificationTemplate[] = [
  {
    id: 'default-federal-v1',
    jurisdiction: 'Federal',
    subject: 'Notice of Data Security Incident',
    body: 'We are writing to inform you of a data security incident involving your information. Breach ID: {{breachId}}',
    version: 1,
  },
  {
    id: 'default-ca-v1',
    jurisdiction: 'CA',
    subject: 'California Data Breach Notification',
    body: 'This notice is provided pursuant to California law. Breach ID: {{breachId}}',
    version: 1,
  },
];

export class BreachNotificationTemplateService {
  private templates: BreachNotificationTemplate[] = [...defaultTemplates];

  async getBreachNotificationTemplate(jurisdiction: string): Promise<BreachNotificationTemplate> {
    const match = this.templates
      .filter((t) => t.jurisdiction === jurisdiction)
      .sort((a, b) => b.version - a.version)[0];

    return match ?? this.templates[0];
  }

  async generateBreachNotice(
    breachId: string,
    individual: { leadId: string; name?: string; email?: string },
  ): Promise<Document> {
    const template = await this.getBreachNotificationTemplate('Federal');
    const content = template.body
      .replaceAll('{{breachId}}', breachId)
      .replaceAll('{{leadId}}', individual.leadId)
      .replaceAll('{{name}}', individual.name ?? '');

    return {
      fileName: `breach-notice-${breachId}-${individual.leadId}.txt`,
      mimeType: 'text/plain',
      content,
    };
  }

  async customizeNotification(
    templateId: string,
    customizations: Partial<Omit<BreachNotificationTemplate, 'id' | 'version' | 'jurisdiction'>> & {
      jurisdiction?: string;
    },
  ): Promise<BreachNotificationTemplate> {
    const base = this.templates.find((t) => t.id === templateId);

    const version = (base?.version ?? 0) + 1;
    const newTemplate: BreachNotificationTemplate = {
      id: `tmpl-${randomUUID().slice(0, 8)}`,
      jurisdiction: customizations.jurisdiction ?? base?.jurisdiction ?? 'Federal',
      subject: customizations.subject ?? base?.subject ?? 'Breach Notice',
      body: customizations.body ?? base?.body ?? 'Breach ID: {{breachId}}',
      version,
    };

    this.templates.push(newTemplate);
    return newTemplate;
  }

  async listTemplateVariations(jurisdiction: string): Promise<BreachNotificationTemplate[]> {
    return this.templates
      .filter((t) => t.jurisdiction === jurisdiction)
      .sort((a, b) => b.version - a.version);
  }
}
