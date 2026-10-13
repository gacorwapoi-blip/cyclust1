import fs from 'fs';
import path from 'path';
import type { RecordedDecision } from '../src/types.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRADES_FILE = path.join(DATA_DIR, 'trades.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[ServerStorage] Error creating data directory:', err);
  }
}

/**
 * Read trades from persistent server storage.
 */
export function loadServerTrades(): RecordedDecision[] {
  ensureDataDir();
  try {
    if (!fs.existsSync(TRADES_FILE)) {
      fs.writeFileSync(TRADES_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }

    const raw = fs.readFileSync(TRADES_FILE, 'utf-8');
    if (!raw.trim()) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t) => t && typeof t === 'object' && t.id && t.symbol);
    }
    return [];
  } catch (err) {
    console.error('[ServerStorage] Error reading trades file:', err);
    return [];
  }
}

/**
 * Write trades to persistent server storage with atomic write.
 */
export function saveServerTrades(trades: RecordedDecision[]): void {
  ensureDataDir();
  try {
    const valid = Array.isArray(trades)
      ? trades.filter((t) => t && typeof t === 'object' && t.id && t.symbol)
      : [];
    const tempFile = `${TRADES_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(valid, null, 2), 'utf-8');
    fs.renameSync(tempFile, TRADES_FILE);
  } catch (err) {
    console.error('[ServerStorage] Error saving trades file:', err);
  }
}

/**
 * Merges two lists of trades deterministically.
 * Preserves resolved outcomes (WIN/LOSS/BREAK_EVEN/CANCELLED), trailing stop progress,
 * and newest modifications.
 */
export function mergeTradeLists(
  current: RecordedDecision[],
  incoming: RecordedDecision[]
): RecordedDecision[] {
  const tradeMap = new Map<string, RecordedDecision>();

  // Helper to score completeness/finality of a trade record
  const getRecordScore = (t: RecordedDecision): number => {
    let score = 0;
    // Closed statuses have higher priority than OPEN/PENDING
    if (t.status === 'WIN' || t.status === 'LOSS' || t.status === 'BREAK_EVEN' || t.status === 'CANCELLED') {
      score += 100;
    } else if (t.status === 'OPEN') {
      score += 50;
    } else if (t.status === 'PENDING') {
      score += 10;
    }

    if (t.entryTriggered) score += 5;
    if (t.exitPrice && t.exitPrice > 0) score += 10;
    if (t.closedTimestamp) score += 10;
    if (t.highestFloatingPips && t.highestFloatingPips > 0) score += 2;
    if (t.trailingStopPrice && t.trailingStopPrice > 0) score += 5;

    return score;
  };

  // Add existing
  for (const t of current) {
    if (t && t.id) {
      tradeMap.set(t.id, t);
    }
  }

  // Merge or add incoming
  for (const inc of incoming) {
    if (!inc || !inc.id) continue;
    const existing = tradeMap.get(inc.id);
    if (!existing) {
      tradeMap.set(inc.id, inc);
    } else {
      const existingScore = getRecordScore(existing);
      const incomingScore = getRecordScore(inc);

      if (incomingScore > existingScore) {
        tradeMap.set(inc.id, inc);
      } else if (incomingScore === existingScore) {
        // If equal, prefer the one with highest floating pips or recent closed time
        const exTime = new Date(existing.closedTimestamp || existing.timestamp).getTime();
        const incTime = new Date(inc.closedTimestamp || inc.timestamp).getTime();
        if (incTime >= exTime) {
          tradeMap.set(inc.id, {
            ...existing,
            ...inc,
            highestFloatingPips: Math.max(existing.highestFloatingPips || 0, inc.highestFloatingPips || 0),
          });
        }
      } else {
        // Keep existing, but retain highest floating pips if incoming had higher
        tradeMap.set(inc.id, {
          ...inc,
          ...existing,
          highestFloatingPips: Math.max(existing.highestFloatingPips || 0, inc.highestFloatingPips || 0),
        });
      }
    }
  }

  // Sort descending by timestamp
  return Array.from(tradeMap.values()).sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA;
  });
}
