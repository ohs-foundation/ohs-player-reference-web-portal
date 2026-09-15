import { beforeEach, describe, expect, it } from 'vitest';
import {
  isInstanceMissingSetupData,
  isSetupAutoRedirectSkipped,
  SETUP_WIZARD_SKIP_AUTO_REDIRECT_KEY,
  skipSetupAutoRedirect,
} from './setupReadiness';

describe('setupReadiness', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('treats missing counts as not empty (avoid false positive while loading)', () => {
    expect(isInstanceMissingSetupData(undefined, undefined)).toBe(false);
    expect(isInstanceMissingSetupData(0, undefined)).toBe(false);
    expect(isInstanceMissingSetupData(undefined, 0)).toBe(false);
  });

  it('is empty only when both Location and Organization totals are 0', () => {
    expect(isInstanceMissingSetupData(0, 0)).toBe(true);
    expect(isInstanceMissingSetupData(1, 0)).toBe(false);
    expect(isInstanceMissingSetupData(0, 1)).toBe(false);
    expect(isInstanceMissingSetupData(3, 2)).toBe(false);
  });

  it('persists skip flag in sessionStorage', () => {
    expect(isSetupAutoRedirectSkipped()).toBe(false);
    skipSetupAutoRedirect();
    expect(isSetupAutoRedirectSkipped()).toBe(true);
    expect(sessionStorage.getItem(SETUP_WIZARD_SKIP_AUTO_REDIRECT_KEY)).toBe('1');
  });
});
