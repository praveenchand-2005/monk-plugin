import { webPageConnector } from './web-page';
import type { Connector } from './types';

const connectors: Connector[] = [webPageConnector];

export function getConnectors(): Connector[] {
  return connectors;
}

export function getConnector(id: string): Connector | undefined {
  return connectors.find((connector) => connector.id === id);
}
