import type { Connector } from '@/lib/connector-sdk';
import { webPageConnector } from '@/lib/web-connector';

const connectors: Connector[] = [webPageConnector];

export function listConnectors() {
  return connectors.map(({ id, name, description, supports }) => ({ id, name, description, supports }));
}

export function getConnector(id: string) {
  const connector = connectors.find((item) => item.id === id);
  if (!connector) throw new Error(`Unknown connector: ${id}`);
  return connector;
}
