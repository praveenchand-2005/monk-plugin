import { webPageConnector } from './web-page';
import { webSearchConnector } from './web-search';
import type { Connector } from './types';

const connectors: Connector[] = [webPageConnector, webSearchConnector];

export function getConnectors(): Connector[] {
  return connectors;
}

export function getConnector(id: string): Connector | undefined {
  return connectors.find((connector) => connector.id === id);
}
