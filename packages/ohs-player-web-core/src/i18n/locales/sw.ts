import type { MessageCatalog } from '../../types/config';

/**
 * Swahili stub catalog — proves hosts can swap locales without forking the library.
 * Strings are placeholder translations for development only.
 */
export const swMessageCatalogStub = {
  appName: 'OHS Player',

  loading: 'Inapakia…',
  saving: 'Inahifadhi…',
  saved: 'Imehifadhiwa',
  saveFailed: 'Imeshindwa kuhifadhi',

  error: 'Hitilafu imetokea',
  unauthorized: 'Huna ruhusa kuona hii',
  retry: 'Jaribu tena',
  empty: 'Hakuna data',

  save: 'Hifadhi',
  cancel: 'Ghairi',
  delete: 'Futa',
  edit: 'Hariri',
  create: 'Unda',
  close: 'Funga',
  signIn: 'Ingia',
  signOut: 'Ondoka',
  search: 'Tafuta',
  back: 'Rudi',

  fieldRequired: 'Inahitajika',
  fieldRequiredAsterisk: '*',
  fieldInstructionsRequiredJoiner: ' · ',
  fieldRequiredError: 'Sehemu hii inahitajika',
  selectPlaceholder: 'Chagua…',

  emptyTitle: 'Hakuna chochote',
  emptyDescription: 'Hakuna kitu hapa bado.',
  errorTitle: 'Hitilafu imetokea',
  errorDescription:
    'Tafadhali jaribu tena. Ikiwa shida itaendelea, wasiliana na msimamizi.',

  lastUpdated: 'Imesasishwa mwisho {{when}}',

  selectAll: 'Chagua safu zote',
  selectRow: 'Chagua safu',
} as const satisfies MessageCatalog;
