import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setAccessToken } from '@/lib/api';

window.scrollTo = vi.fn();
afterEach(() => { cleanup(); setAccessToken(null); localStorage.clear(); vi.restoreAllMocks(); });
