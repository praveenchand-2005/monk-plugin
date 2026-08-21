export type TargetKind = 'person' | 'company' | 'email' | 'phone' | 'username' | 'domain' | 'url' | 'ip' | 'address' | 'custom';

export type ConnectorContext = {
  caseId: string;
  target: { kind: TargetKind; value: string };
  signal?: AbortSignal;
};

export type EvidenceRecord = {
  sourceType: string;
  sourceUrl?: string;
  sourceRef?: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type ConnectorResult = {
  connector: string;
  records: EvidenceRecord[];
  warnings: string[];
};

export type Connector = {
  id: string;
  name: string;
  description: string;
  supports(kind: TargetKind): boolean;
  collect(ctx: ConnectorContext): Promise<ConnectorResult>;
};
