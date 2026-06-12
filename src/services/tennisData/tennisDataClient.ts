import { sampleTennisDataPort } from '@/services/tennisData/samplePort';
import type { TennisDataPort } from '@/services/tennisData/tennisDataPort';

/*
 * Active port binding. When the ingestion service and cached API layer ship
 * (plan §5), the HTTP/WebSocket-backed implementation replaces the sample
 * port here — hooks and components are unaffected.
 */
export const tennisData: TennisDataPort = sampleTennisDataPort;
