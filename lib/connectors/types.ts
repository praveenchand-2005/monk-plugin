export type TargetKind = 'person' | 'company' | 'email' | 'phone' | 'username' | 'domain' | 'url' | 'ip' | 'address' | 'custom';

export interface ConnectorContext {
  caseId: string;
  target: { kind: TargetKind; value: string };
  signal?: AbortSignal;
}

export interface EvidenceRecord {
  sourceType: string;
  sourceUrl?: string;
  sourceRef?: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectorResult {
  connectorId: string;
  records: EvidenceRecord[];
  warnings: string[];
}

export interface Connector {
  id: string;
  name: string;
  supports(kind: TargetKind): boolean;
  collect(context: ConnectorContext): Promise<ConnectorResult>;
}
