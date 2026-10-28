import { useCallback, useState } from 'react';
import { useCustomEndpoint } from 'ohs-player-web-core';
import { portalConfigJsonSchema, type PortalConfig } from '../../config/portalConfigSchema';
import { isJsonObject } from './configDraft';

export const CONFIG_ASSIST_ALIAS = 'configAssist';
export const MAX_ASSIST_REQUEST_LENGTH = 2000;

export interface AssistReply {
  proposal: Record<string, unknown>;
  summary?: string;
}

export class NotAConfigDocumentError extends Error {
  constructor() {
    super('The assistant did not return a configuration document');
    this.name = 'NotAConfigDocumentError';
  }
}

export function isAssistReply(value: unknown): value is AssistReply {
  return (
    isJsonObject(value) &&
    isJsonObject(value.proposal) &&
    (value.summary === undefined || typeof value.summary === 'string')
  );
}

export interface ConfigAssist {
  pending: boolean;
  ask: (request: string, document: PortalConfig) => Promise<AssistReply>;
}

export function useConfigAssist(): ConfigAssist {
  const { mutateAsync } = useCustomEndpoint(CONFIG_ASSIST_ALIAS).post;
  const [pending, setPending] = useState(false);

  const ask = useCallback(
    async (request: string, document: PortalConfig) => {
      setPending(true);
      try {
        const reply = await mutateAsync({ request, document, schema: portalConfigJsonSchema() });
        if (!isAssistReply(reply)) throw new NotAConfigDocumentError();
        return reply;
      } finally {
        setPending(false);
      }
    },
    [mutateAsync],
  );

  return { pending, ask };
}
