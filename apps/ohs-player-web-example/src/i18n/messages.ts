import type { MessageCatalog } from 'ohs-player-web-core';

export const messages = {
  appTopbarTitle: 'OHS Example Portal',
  pageUsers: 'Users',
  pageUsersDescription: 'Search and manage practitioner accounts.',
  rowActions: 'Row actions',
} as const satisfies Partial<MessageCatalog>;
