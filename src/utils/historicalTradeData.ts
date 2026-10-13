import { RecordedDecision } from '../types.ts';

/**
 * Clean data policy: No dummy/mock trades.
 * Real trading journals only contain authentic user and system-recorded decisions.
 */
export const HISTORICAL_BENCHMARK_TRADES: RecordedDecision[] = [];
