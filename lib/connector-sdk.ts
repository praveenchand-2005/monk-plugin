export type ConnectorContext = {
  caseId: string;
  target: string;
  signal?: AbortSignal;
};

export type EvidenceItem = {
  sourceType: string;
  sourceUrl?: string;
  sourceRef?: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type ConnectorResult = {
  connector: string;
  items: EvidenceItem[];
};

export type Connector = {
  id: string;
  name: string;
  description: string;
  supports: string[];
  collect(ctx: ConnectorContext): Promise<ConnectorResult>;
};
