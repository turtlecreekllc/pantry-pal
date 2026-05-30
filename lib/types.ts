// Backwards-compatible barrel — preserves `from '../lib/types'` import paths
// after the per-domain split. New types belong in `lib/types/<domain>.ts`.
export * from './types/index';
