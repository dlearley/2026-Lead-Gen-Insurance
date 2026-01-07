import { logger } from '@leads-mono/core/logger';
import { Traceable } from '@leads-mono/core/monitoring/tracing-decorators';
import nlp from 'compromise';
import compromiseNER from 'compromise-ner';
import { createHfInference } from './huggingface-client';
import { NLPConfig } from '../../config/nlp.config';

nlp.plugin(compromiseNER);

export interface Entity {
  text: string;
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'PRODUCT' | 'TECHNOLOGY' | 
         'INDUSTRY' | 'MONEY' | 'DATE' | 'PERCENT' | 'TIME' | 'QUANTITY' |
         'ROLE' | 'PAIN_POINT' | 'USE_CASE' | 'COMPETITOR' | 'VENDOR' |
         'INTEGRATION' | 'COMPLIANCE';
  start: number;
  end: number;
  confidence: number;
  linkedEntity?: string; // Disambiguated entity ID
  attributes?: Record<string, any>;
  relationships?: Array<{
    relation: string;
    target: string;
    confidence: number;
  }>;
}

export interface EntityExtractionResult {
  entities: Entity[];
  disambiguated: Record<string, string[]>;
  relationships: Array<{
    subject: string;
    predicate: string;
    object: string;
    confidence: number;
  }>;
  knowledgeGraph: {
    nodes: Array<{ id: string; type: string; properties: Record<string, any> }>;
    edges: Array<{ source: string; target: string; relation: string; weight: number }>;
  };
}

export class EntityRecognizer {
  private static instance: EntityRecognizer;
  private hfInference: any;
  private entityDictionary: Map<string, Entity[]>;
  private technologyStack: Map<string, string[]>;
  private competitionMap: Map<string, string[]>;

  constructor() {
    this.hfInference = createHfInference();
    this.entityDictionary = new Map();
    this.technologyStack = new Map();
    this.competitionMap = new Map();
    this.initializeEntityDictionaries();
  }

  static getInstance(): EntityRecognizer {
    if (!EntityRecognizer.instance) {
      EntityRecognizer.instance = new EntityRecognizer();
    }
    return EntityRecognizer.instance;
  }

  @Traceable('ner.extractEntities')
  async extractEntities(text: string, context?: {
    domain?: string;
    source?: string;
  }): Promise<EntityExtractionResult> {
    try {
      logger.info('Extracting entities', { textLength: text.length, domain: context?.domain });

      // Parallel extraction: rule-based + ML approaches
      const [ruleBased, mlResult] = await Promise.allSettled([
        this.ruleBasedEntityExtraction(text),
        NLPConfig.useAdvancedModels ? this.mlEntityExtraction(text) : null
      ]);

      // Combine and deduplicate results
      const combinedEntities = await this.combineEntities(
        ruleBased.status === 'fulfilled' ? ruleBased.value : [],
        mlResult.status === 'fulfilled' && mlResult.value ? mlResult.value : []
      );

      // Disambiguation and entity linking
      const disambiguated = await this.disambiguateEntities(combinedEntities);
      
      // Relationship extraction
      const relationships = await this.extractRelationships(text, combinedEntities);
      
      // Build knowledge graph
      const knowledgeGraph = await this.buildKnowledgeGraph(combinedEntities, relationships);

      const result: EntityExtractionResult = {
        entities: combinedEntities,
        disambiguated,
        relationships,
        knowledgeGraph
      };

      logger.info('Entity extraction completed', {
        entities: combinedEntities.length,
        relationships: relationships.length
      });

      return result;
    } catch (error) {
      logger.error('Entity extraction failed', { error, text });
      throw error;
    }
  }

  @Traceable('ner.ruleBased')
  private async ruleBasedEntityExtraction(text: string): Promise<Entity[]> {
    const doc = nlp(text);
    const entities: Entity[] = [];

    // Named Entity Recognition with compromise
    const nerEntities = doc.ner();
    nerEntities.forEach((ner: any) => {
      entities.push({
        text: ner.text,
        type: this.mapNERType(ner.type),
        start: ner.offset.start,
        end: ner.offset.end,
        confidence: 0.7
      });
    });

    // Custom entity extraction
    const customEntities = [
      ...this.extractTechnologies(text),
      ...this.extractPersonNames(text),
      ...this.extractCompanies(text),
      ...this.extractRoles(text),
      ...this.extractPainPoints(text),
      ...this.extractUseCases(text),
      ...this.extractIntegrations(text),
      ...this.extractCompliance(text),
      ...this.extractMonetaryValues(text),
      ...this.extractTimeExpressions(text)
    ];

    // Merge and deduplicate
    return this.mergeEntities([...entities, ...customEntities]);
  }

  @Traceable('ner.mlBased')
  private async mlEntityExtraction(text: string): Promise<Entity[]> {
    try {
      if (!this.hfInference) {
        logger.warn('ML inference not available for NER');
        return [];
      }

      const result = await this.hfInference.tokenClassification({
        inputs: text,
        model: 'dslim/bert-base-NER'
      });

      return result.map((entity: any) => ({
        text: entity.word,
        type: this.mapHFEntityType(entity.entity),
        start: entity.start,
        end: entity.end,
        confidence: entity.score
      }));
    } catch (error) {
      logger.warn('ML entity extraction failed', { error });
      return [];
    }
  }

  private extractTechnologies(text: string): Entity[] {
    const technologies = [
      'salesforce', 'hubspot', 'pipedrive', 'zoho', 'freshworks',
      'microsoft dynamics', 'salesforce crm', 'hubspot crm',
      'api', 'sdk', 'rest api', 'graphql', 'webhook',
      'aws', 'azure', 'gcp', 'google cloud', 'amazon web services',
      'javascript', 'typescript', 'python', 'nodejs', 'react', 'angular',
      'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
      'docker', 'kubernetes', 'terraform', 'jenkins', 'cicd'
    ];

    return this.extractEntitiesByType(text, technologies, 'TECHNOLOGY', 0.8);
  }

  private extractPersonNames(text: string): Entity[] {
    const doc = nlp(text);
    const people = doc.people().out('array');
    
    return people.map((person: string) => {
      const start = text.indexOf(person);
      return {
        text: person,
        type: 'PERSON',
        start,
        end: start + person.length,
        confidence: 0.7
      };
    });
  }

  private extractCompanies(text: string): Entity[] {
    const companies = [
      // Insurance companies
      'geico', 'state farm', 'allstate', 'progressive', 'liberty mutual',
      'nationwide', 'usaa', 'farmers insurance', 'travelers', 'chubb',
      'aetna', 'cigna', 'humana', 'unitedhealthcare', 'blue cross',
      // Tech companies
      'apple', 'google', 'microsoft', 'amazon', 'salesforce', 'hubspot',
      'pipedrive', 'zoho', 'freshworks', 'slack', 'zoom', 'atlassian',
      // General patterns
      ...text.match(/\b(?:[A-Z][a-z]+\s+){1,3}(?:Inc\.|Corp\.|LLC|Limited|Insurance|Inc|Corp)\b/g) || []
    ];

    return this.extractEntitiesByType(text, companies, 'ORGANIZATION', 0.7);
  }

  private extractRoles(text: string): Entity[] {
    const roles = [
      'ceo', 'cto', 'cfo', 'cio', 'coo', 'vp', 'vice president',
      'director', 'manager', 'head of', 'lead', 'principal',
      'data scientist', 'engineer', 'developer', 'analyst',
      'sales manager', 'marketing director', 'product manager',
      'insurance agent', 'underwriter', 'actuary', 'claims adjuster'
    ];

    return this.extractEntitiesByType(text, roles, 'ROLE', 0.6);
  }

  private extractPainPoints(text: string): Entity[] {
    const painPatterns = [
      'slow', 'inefficient', 'manual', 'error-prone', 'expensive',
      'outdated', 'legacy system', 'data silos', 'integration issues',
      'lack of visibility', 'poor communication', 'missed opportunities',
      'low conversion', 'high churn', 'customer dissatisfaction',
      'compliance risk', 'security concerns', 'scalability issues'
    ];

    return this.extractEntitiesByType(text, painPatterns, 'PAIN_POINT', 0.6);
  }

  private extractUseCases(text: string): Entity[] {
    const useCases = [
      'lead scoring', 'customer segmentation', 'churn prediction',
      'recommendation engine', 'automated outreach', 'personalization',
      'risk assessment', 'fraud detection', 'customer lifetime value',
      'cross-sell', 'upsell', 'retention campaign', 'targeted marketing'
    ];

    return this.extractEntitiesByType(text, useCases, 'USE_CASE', 0.6);
  }

  private extractIntegrations(text: string): Entity[] {
    const integrationPatterns = [
      'integrate with', 'connect to', 'sync with', 'api integration',
      'data pipeline', 'workflow automation', 'third-party integration',
      'crm integration', 'marketing automation integration',
      'erp integration', 'data warehouse integration'
    ];

    return this.extractEntitiesByType(text, integrationPatterns, 'INTEGRATION', 0.6);
  }

  private extractCompliance(text: string): Entity[] {
    const complianceItems = [
      'gdpr', 'hipaa', 'soc2', 'pci dss', 'sox', 'ccpa',
      'general data protection regulation', 'health insurance portability',
      'sarbanes-oxley', 'california consumer privacy act',
      'data privacy', 'regulatory compliance', 'security standards'
    ];

    return this.extractEntitiesByType(text, complianceItems, 'COMPLIANCE', 0.8);
  }

  private extractMonetaryValues(text: string): Entity[] {
    const currencyPattern = /\$?\s?\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|dollars?)/gi;
    const matches = text.matchAll(currencyPattern);
    
    return Array.from(matches).map(match => ({
      text: match[0],
      type: 'MONEY',
      start: match.index,
      end: match.index + match[0].length,
      confidence: 0.9
    }));
  }

  private extractTimeExpressions(text: string): Entity[] {
    const timePatterns = [
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?\b/gi,
      /\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b/g,
      /\bq[1-4]\s+(?:\d{4})?\b/gi,
      /\b(?:asap|urgent|immediately|right away|critical|pressing)\b/gi
    ];

    const timeEntities: Entity[] = [];
    
    timePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      Array.from(matches).forEach(match => {
        timeEntities.push({
          text: match[0],
          type: 'DATE',
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.8
        });
      });
    });

    return timeEntities;
  }

  private extractEntitiesByType(text: string, patterns: string[], type: Entity['type'], confidence: number): Entity[] {
    const entities: Entity[] = [];
    
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = text.matchAll(regex);
      
      Array.from(matches).forEach(match => {
        if (match && match.index !== undefined) {
          entities.push({
            text: match[0],
            type,
            start: match.index,
            end: match.index + match[0].length,
            confidence
          });
        }
      });
    });

    return entities;
  }

  private mergeEntities(entities: Entity[]): Entity[] {
    const merged: Entity[] = [];
    const seen = new Set<string>();

    entities.sort((a, b) => a.start - b.start).forEach(entity => {
      const key = `${entity.start}-${entity.end}-${entity.text.toLowerCase()}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(entity);
      }
    });

    return merged;
  }

  private async combineEntities(ruleBased: Entity[], mlBased: Entity[]): Promise<Entity[]> {
    // Merge both results, prioritizing ML if confidence is higher
    const combined = [...ruleBased];
    
    mlBased.forEach(mlEntity => {
      const existing = combined.find(rb => 
        rb.text.toLowerCase() === mlEntity.text.toLowerCase() ||
        Math.abs(rb.start - mlEntity.start) < 5
      );

      if (existing) {
        if (mlEntity.confidence > existing.confidence) {
          existing.confidence = mlEntity.confidence;
          existing.type = mlEntity.type;
        }
      } else {
        combined.push(mlEntity);
      }
    });

    return combined;
  }

  private async disambiguateEntities(entities: Entity[]): Promise<Record<string, string[]>> {
    const disambiguated: Record<string, string[]> = {};
    
    entities.forEach(entity => {
      // Company disambiguation
      if (entity.type === 'ORGANIZATION') {
        const variants = this.findCompanyVariants(entity.text);
        if (variants.length > 1) {
          disambiguated[entity.text] = variants;
        }
        entity.linkedEntity = variants[0] || entity.text;
      }

      // Technology linking
      if (entity.type === 'TECHNOLOGY') {
        const techCategory = this.categorizeTechnology(entity.text);
        entity.linkedEntity = techCategory;
        disambiguated[entity.text] = [entity.text, techCategory];
      }
    });

    return disambiguated;
  }

  private findCompanyVariants(company: string): string[] {
    const variants: string[] = [company];
    
    // Common corporate suffixes
    const suffixes = ['inc.', 'corp.', 'llc', 'limited', 'inc', 'corp'];
    const normalized = company.toLowerCase().trim();
    
    suffixes.forEach(suffix => {
      if (normalized.includes(suffix)) {
        const base = normalized.replace(suffix, '').trim();
        variants.push(base);
        // Add variations
        suffixes.forEach(otherSuffix => {
          if (otherSuffix !== suffix) {
            variants.push(`${base} ${otherSuffix}`);
          }
        });
      }
    });

    return Array.from(new Set(variants));
  }

  private categorizeTechnology(tech: string): string {
    const categories = {
      'CRM': ['salesforce', 'hubspot', 'pipedrive', 'zoho', 'freshworks', 'crm'],
      'Cloud': ['aws', 'azure', 'gcp', 'google cloud', 'amazon web services'],
      'Database': ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch'],
      'Programming': ['javascript', 'typescript', 'python', 'nodejs', 'react', 'angular'],
      'DevOps': ['docker', 'kubernetes', 'terraform', 'jenkins', 'cicd']
    };

    const techLower = tech.toLowerCase();
    
    for (const [category, items] of Object.entries(categories)) {
      if (items.some(item => techLower.includes(item))) {
        return category;
      }
    }

    return 'General';
  }

  private async extractRelationships(text: string, entities: Entity[]): Promise<EntityExtractionResult['relationships']> {
    const relationships = [];
    
    // Extract "problem → solution" relationships
    const problemSolutionPattern = /(\w+)\s+(problem|issue|challenge|pain|struggle)\s+.*\s+(solution|fix|resolve|solve|implement|use)\s+(\w+)/gi;
    const psMatches = text.matchAll(problemSolutionPattern);
    
    Array.from(psMatches).forEach(match => {
      if (match && match.length >= 5) {
        relationships.push({
          subject: match[1],
          predicate: 'hasSolution',
          object: match[4],
          confidence: 0.7
        });
      }
    });

    // Extract "company uses technology" relationships
    entities.filter(e => e.type === 'ORGANIZATION').forEach(company => {
      const techEntities = entities.filter(e => 
        e.type === 'TECHNOLOGY' && 
        Math.abs(e.start - company.end) < 50
      );
      
      techEntities.forEach(tech => {
        relationships.push({
          subject: company.text,
          predicate: 'uses',
          object: tech.text,
          confidence: 0.6
        });
      });
    });

    return relationships;
  }

  private async buildKnowledgeGraph(entities: Entity[], relationships: any[]): Promise<EntityExtractionResult['knowledgeGraph']> {
    const nodes = entities.map(entity => ({
      id: entity.text,
      type: entity.type,
      properties: {
        confidence: entity.confidence,
        linkedEntity: entity.linkedEntity,
        attributes: entity.attributes
      }
    }));

    const edges = relationships.map(rel => ({
      source: rel.subject,
      target: rel.object,
      relation: rel.predicate,
      weight: rel.confidence
    }));

    return { nodes, edges };
  }

  private mapNERType(type: string): Entity['type'] {
    const typeMap: Record<string, Entity['type']> = {
      'PERSON': 'PERSON',
      'ORGANIZATION': 'ORGANIZATION',
      'LOCATION': 'LOCATION',
      'PRODUCT': 'PRODUCT',
      'MONEY': 'MONEY',
      'DATE': 'DATE',
      'PERCENT': 'PERCENT',
      'TIME': 'TIME',
      'QUANTITY': 'QUANTITY'
    };
    
    return typeMap[type] || 'PRODUCT';
  }

  private mapHFEntityType(type: string): Entity['type'] {
    const typeMap: Record<string, Entity['type']> = {
      'B-PER': 'PERSON', 'I-PER': 'PERSON',
      'B-ORG': 'ORGANIZATION', 'I-ORG': 'ORGANIZATION',
      'B-LOC': 'LOCATION', 'I-LOC': 'LOCATION',
      'B-MISC': 'PRODUCT', 'I-MISC': 'PRODUCT'
    };
    
    return typeMap[type] || 'PRODUCT';
  }

  private initializeEntityDictionaries(): void {
    // Initialize technology stack mappings
    this.technologyStack.set('salesforce', ['crm', 'cloud', 'enterprise']);
    this.technologyStack.set('hubspot', ['crm', 'marketing', 'sales']);
    this.technologyStack.set('aws', ['cloud', 'hosting', 'infrastructure']);
    
    // Initialize competition mappings
    this.competitionMap.set('salesforce', ['hubspot', 'pipedrive', 'zoho', 'microsoft dynamics']);
    this.competitionMap.set('hubspot', ['salesforce', 'pipedrive', 'zoho']);
  }

  @Traceable('ner.batchExtract')
  async batchExtract(texts: string[]): Promise<EntityExtractionResult[]> {
    return Promise.all(texts.map(text => this.extractEntities(text)));
  }

  @Traceable('ner.extractCompetitors')
  async extractCompetitors(text: string): Promise<string[]> {
    const result = await this.extractEntities(text);
    const products = result.entities.filter(e => e.type === 'TECHNOLOGY' || e.type === 'PRODUCT');
    const competitors: string[] = [];
    
    products.forEach(product => {
      const comps = this.competitionMap.get(product.text.toLowerCase()) || [];
      competitors.push(...comps);
    });
    
    return Array.from(new Set(competitors));
  }
}