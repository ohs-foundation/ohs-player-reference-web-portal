import type { MessageCatalog } from '../../types/config';

/**
 * Canonical English catalog for every user-visible string the library renders.
 * Host applications may override individual keys via `I18nConfig.messages`.
 *
 * Strings follow the Open Health Stack design guidelines:
 *  - short, sentence-case titles
 *  - plain language, no blame ("Phone must be 10 digits", not "You entered…")
 *  - "Required" word accompanies the asterisk
 */
export const defaultMessageCatalog = {
  appName: 'OHS Player',

  loading: 'Loading…',
  saving: 'Saving…',
  saved: 'Saved',
  saveFailed: 'Could not save',

  error: 'Something went wrong',
  unauthorized: 'You are not authorized to view this',
  retry: 'Retry',
  empty: 'No data',

  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  create: 'Create',
  close: 'Close',
  signIn: 'Sign in',
  signOut: 'Sign out',
  search: 'Search',
  back: 'Back',

  fieldRequired: 'Required',
  fieldRequiredAsterisk: '*',
  fieldInstructionsRequiredJoiner: ' · ',
  fieldRequiredError: 'This field is required',
  selectPlaceholder: 'Select…',

  emptyTitle: 'Nothing to show',
  emptyDescription: 'There is nothing here yet.',
  errorTitle: 'Something went wrong',
  errorDescription: 'Please try again. If the problem continues, contact your administrator.',

  lastUpdated: 'Last updated {{when}}',

  selectAll: 'Select all rows',
  selectRow: 'Select row',
} as const satisfies MessageCatalog;

export type MessageKey = keyof typeof defaultMessageCatalog;
