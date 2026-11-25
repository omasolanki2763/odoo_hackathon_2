/**
 * Global test setup for the frontend suite.
 *
 * Registers the jest-dom matchers (toBeInTheDocument and friends) on Vitest's
 * expect, unmounts React trees between tests, and clears localStorage so a
 * test that signs a user in cannot leak auth state into the next test.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  // Testing Library does not unmount automatically when globals are disabled.
  cleanup();
  // Auth lives in localStorage, which jsdom keeps for the whole file.
  localStorage.clear();
});
