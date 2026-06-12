import { httpTennisDataPort } from '@/services/tennisData/httpPort';
import { sampleTennisDataPort } from '@/services/tennisData/samplePort';
import type { TennisDataPort } from '@/services/tennisData/tennisDataPort';

/*
 * Active port binding: production reads the cached API layer (api/tennis.ts
 * on Vercel); dev and tests use the sample port. Run `vercel dev` to
 * exercise the live path locally.
 */
export const tennisData: TennisDataPort = import.meta.env.PROD
  ? httpTennisDataPort
  : sampleTennisDataPort;
