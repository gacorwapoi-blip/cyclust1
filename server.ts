import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { generateLiveQuantAnalysis, fetchLiveMarketQuotes } from './server/quantEngine.ts';
import { syncOpenTradesWithCandles } from './server/historicalSync.ts';
import {
  loadServerTrades,
  saveServerTrades,
  mergeTradeLists,
} from './server/tradesStorage.ts';
import { AssetSymbol, RecordedDecision } from './src/types.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Explicit download endpoint for source zip
app.get(['/trade-quant-vps.zip', '/api/download-zip'], (req, res) => {
  const possiblePaths = [
    path.resolve(process.cwd(), 'public', 'trade-quant-vps.zip'),
    path.resolve(process.cwd(), 'trade-quant-vps.zip'),
  ];
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="trade-quant-vps.zip"');
      return res.sendFile(filePath);
    }
  }
  return res.status(404).send('ZIP file not found');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Fast real-time quotes endpoint for open trades ticker & position monitoring
app.get('/api/quotes', async (req, res) => {
  try {
    const quotes = await fetchLiveMarketQuotes();
    return res.json({
      status: 'ok',
      quotes,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[API] fetchLiveMarketQuotes error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch quotes' });
  }
});

// Historical Candle Backfill / Auto-Sync for offline trades
app.post('/api/sync-trades', async (req, res) => {
  try {
    const { trades = [] } = req.body || {};
    const serverStored = loadServerTrades();
    const sourceTrades = Array.isArray(trades) && trades.length > 0 ? trades : serverStored;
    const result = await syncOpenTradesWithCandles(sourceTrades);
    if (result && Array.isArray(result.updatedTrades)) {
      const merged = mergeTradeLists(serverStored, result.updatedTrades);
      saveServerTrades(merged);
      result.updatedTrades = merged;
    }
    return res.json(result);
  } catch (err: any) {
    console.error('[API] Historical candle sync failed:', err);
    return res.status(500).json({
      error: 'SYNC_FAILED',
      message: err.message || 'Gagal sinkronisasi riwayat candle.',
    });
  }
});

// Persistent Trade Journal Storage API
// GET all saved trades
app.get('/api/trades', (req, res) => {
  try {
    const trades = loadServerTrades();
    return res.json({ status: 'ok', trades });
  } catch (err: any) {
    console.error('[API] Get trades failed:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Gagal memuat trade.' });
  }
});

// POST /api/trades: save single trade or save entire trade list
app.post('/api/trades', (req, res) => {
  try {
    const { trade, trades } = req.body || {};
    const serverStored = loadServerTrades();

    let updatedList: RecordedDecision[] = [];
    if (Array.isArray(trades)) {
      updatedList = mergeTradeLists(serverStored, trades);
    } else if (trade && typeof trade === 'object' && trade.id) {
      updatedList = mergeTradeLists(serverStored, [trade]);
    } else {
      updatedList = serverStored;
    }

    saveServerTrades(updatedList);
    return res.json({ status: 'ok', trades: updatedList });
  } catch (err: any) {
    console.error('[API] Save trades failed:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Gagal menyimpan trade.' });
  }
});

// POST /api/trades/sync: bidirectional sync between client and server storage
app.post('/api/trades/sync', (req, res) => {
  try {
    const { trades = [] } = req.body || {};
    const serverStored = loadServerTrades();
    const merged = mergeTradeLists(serverStored, Array.isArray(trades) ? trades : []);
    saveServerTrades(merged);
    return res.json({ status: 'ok', trades: merged });
  } catch (err: any) {
    console.error('[API] Sync trades failed:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Gagal sinkronisasi trade.' });
  }
});

// PUT /api/trades/:id: update a specific trade record
app.put('/api/trades/:id', (req, res) => {
  try {
    const { id } = req.params;
    const incomingData = req.body;
    if (!id || !incomingData) {
      return res.status(400).json({ status: 'error', message: 'ID dan payload trade diperlukan.' });
    }

    const serverStored = loadServerTrades();
    const idx = serverStored.findIndex((t) => t.id === id);
    if (idx === -1) {
      const merged = mergeTradeLists(serverStored, [{ ...incomingData, id }]);
      saveServerTrades(merged);
      return res.json({ status: 'ok', trades: merged });
    }

    serverStored[idx] = {
      ...serverStored[idx],
      ...incomingData,
      id,
    };
    saveServerTrades(serverStored);
    return res.json({ status: 'ok', trades: serverStored, updated: serverStored[idx] });
  } catch (err: any) {
    console.error('[API] Update trade failed:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Gagal memperbarui trade.' });
  }
});

// DELETE /api/trades/:id: delete a specific trade record
app.delete('/api/trades/:id', (req, res) => {
  try {
    const { id } = req.params;
    const serverStored = loadServerTrades();
    const filtered = serverStored.filter((t) => t.id !== id);
    saveServerTrades(filtered);
    return res.json({ status: 'ok', trades: filtered });
  } catch (err: any) {
    console.error('[API] Delete trade failed:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Gagal menghapus trade.' });
  }
});

// POST /api/trades/clear: clear all trade records
app.post('/api/trades/clear', (req, res) => {
  try {
    saveServerTrades([]);
    return res.json({ status: 'ok', trades: [] });
  } catch (err: any) {
    console.error('[API] Clear trades failed:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Gagal mengosongkan trade.' });
  }
});

// Quantitative Market Analysis endpoint (supports XAUUSD, EURUSD & BTCUSD)
app.post('/api/analyze', async (req, res) => {
  const { userNotes = '', userPrice = '', timeframe = '15M', chartImage = null, symbol = 'XAUUSD' } = req.body || {};
  const currentIsoTime = new Date().toISOString();
  const selectedSymbol: AssetSymbol = symbol === 'EURUSD' ? 'EURUSD' : symbol === 'BTCUSD' ? 'BTCUSD' : 'XAUUSD';

  // Try Gemini AI first if configured
  try {
    const ai = getGeminiClient();
    if (ai) {
      const assetLabel = selectedSymbol === 'EURUSD'
        ? 'Euro / US Dollar (EUR/USD)'
        : selectedSymbol === 'BTCUSD'
        ? 'Bitcoin / US Dollar (BTC/USD)'
        : 'Gold (XAU/USD)';
      const prompt = `You are a Senior Quantitative Market Analyst specializing in ${assetLabel}.
Your role is to act as an objective, disciplined AI trading decision-support terminal for ${selectedSymbol}.

SELECTED ASSET: ${selectedSymbol}
SELECTED TIMEFRAME FOR ANALYSIS: ${timeframe} (Context includes 1M ultra-scalp, 5M scalping, 15M execution, 30M intermediate, 1H swing bias)
CURRENT DATE & TIME: ${currentIsoTime}
OPTIONAL TRADER CONTEXT / NOTES: ${userNotes ? `"${userNotes}"` : 'None provided'}
USER OBSERVED BROKER PRICE: ${userPrice ? `"${userPrice}"` : 'None provided'}

CORE DIRECTIVES & DISCIPLINE:
1. NEVER default to "BUY NOW" or "SELL NOW".
2. "WAIT FOR CONFIRMATION" and "NO TRADE" are fully valid, preferred professional outcomes if conditions are ambiguous.
3. DO NOT fabricate prices, economic events, Fed comments, or chart indicators.
4. If chart screenshot is provided, analyze price action, candles, liquidity sweep, and structure visible in the image. If not, state clearly that chart data is based on market quotes and reporting.
5. Identify:
   - Market Regime (TRENDING BULLISH, TRENDING BEARISH, RANGE, HIGH VOLATILITY, UNCLEAR)
   - Liquidity Map: Buy-side (EQH, PDH, PWH, Session High, Swing High) and Sell-side (EQL, PDL, PWL, Session Low, Swing Low)
   - Last Liquidity Event: Liquidity Sweep, False Breakout, Liquidity Grab, Rejection, Displacement after Sweep, Liquidity Run / Continuation
   - Market Structure: HTF Bias vs LTF Structure, BOS, MSS, CHoCH, internal/external structure
   - Price Action Zones: FVG, IFVG, Order Block, Breaker Block, Equilibrium 50%, Premium/Discount
   - Dedicated Scalping Analysis for ${timeframe} (Micro trigger, tight invalidation with pips, quick target with pips, R:R)
   - STRICT & ADAPTIVE RISK-REWARD TP ENGINE:
     * Supported R:R ratios: 1:1, 1:2, and 1:3 depending on market regime and setup quality.
     * MANDATORY MAXIMUM LOSS RULE: For ALL trade setups—whether 1:1, 1:2, or 1:3—the MAXIMUM STOP LOSS (loss risk) MUST NEVER EXCEED 20 PIPS ($2.00 on XAUUSD, 0.00200 on EURUSD, $200 on BTCUSD).
     * 1:1 Scalp Setup: SL <= 20 pips, TP1 = 1x SL (<= 20 pips).
     * 1:2 Trend Setup: SL <= 20 pips (MAX LOSS 20 PIPS), TP1 = 2x SL (30-40 pips).
     * 1:3 Momentum Setup: SL <= 20 pips (MAX LOSS 20 PIPS), TP2 = 3x SL (45-60 pips).
     * Strict / Rawan / Choppy / Counter-Trend Conditions: Adapt TP1 RR to 1:1.0 (<= 20 pips) to secure capital against whipsaws.
   - Trade Entry Structure: Direction, HTF Bias, Regime, Liquidity Target, Event, Confirmation, Entry Zone with exact values, Invalidation with exact SL (max 20 pips distance), Target, RR, Reasons (3-5), What could make this analysis wrong.
   - exactPlans: ALWAYS provide 3 exact execution plans with EXACT prices (PLAN_A Buy Limit, PLAN_B Sell Limit, PLAN_SCALP Intraday).
   - Contrarian Check: What could make this analysis wrong?
   - Multi-factor Scorecard: Trend, Momentum, Structure, Liquidity, Macro, News, Volatility, Setup Quality (0-10, NOT win probability).
   - 3 Scenarios: Bullish, Bearish, No-Trade.

OUTPUT FORMAT REQUIREMENTS:
Output strictly valid JSON enclosed in \`\`\`json ... \`\`\` matching the QuantAnalysisResult schema.`;

      const contents: any[] = [prompt];
      if (chartImage && typeof chartImage === 'string' && chartImage.startsWith('data:image/')) {
        const mimeType = chartImage.substring(5, chartImage.indexOf(';'));
        const base64Data = chartImage.substring(chartImage.indexOf(',') + 1);
        contents.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = response.text || '';

      // Extract JSON block
      let parsedData: any = null;
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      const textToParse = jsonMatch ? jsonMatch[1].trim() : rawText.trim();

      try {
        parsedData = JSON.parse(textToParse);
      } catch (parseError) {
        const sanitized = textToParse
          .replace(/,\s*([\]}])/g, '$1')
          .replace(/^[^{]*({[\s\S]*})[^}]*$/, '$1');
        parsedData = JSON.parse(sanitized);
      }

      // Guarantee exact mathematical levels and exactPlans
      try {
        const quantFallback = await generateLiveQuantAnalysis({
          timeframe: timeframe as any,
          userNotes,
          userPrice,
          symbol: selectedSymbol,
        });

        if (!parsedData.tradeSetup) {
          parsedData.tradeSetup = quantFallback.tradeSetup;
        } else {
          parsedData.tradeSetup.exactPlans = quantFallback.tradeSetup.exactPlans;
          if (
            !parsedData.tradeSetup.entryZone ||
            parsedData.tradeSetup.entryZone.includes('Menunggu') ||
            quantFallback.tradeSetup.exactPlans?.some((p) => p.isDefensiveRR)
          ) {
            parsedData.tradeSetup.entryZone = quantFallback.tradeSetup.entryZone;
            parsedData.tradeSetup.invalidation = quantFallback.tradeSetup.invalidation;
            parsedData.tradeSetup.target = quantFallback.tradeSetup.target;
            parsedData.tradeSetup.rr = quantFallback.tradeSetup.rr;
          }
        }

        parsedData.scalpingDetail = quantFallback.scalpingDetail;
      } catch (quantErr) {
        console.warn('Quant precision merge error:', quantErr);
      }

      // Extract Grounding Chunks (citations & web links)
      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const webSearchQueries =
        response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

      const sources: { title: string; url: string }[] = [];
      const seenUrls = new Set<string>();

      for (const chunk of groundingChunks as any[]) {
        if (chunk.web && chunk.web.uri) {
          const url = chunk.web.uri;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sources.push({
              title: chunk.web.title || 'Market Source',
              url: url,
            });
          }
        }
      }

      // Combine into final response
      const result = {
        ...parsedData,
        symbol: selectedSymbol,
        timeframe,
        sources: sources.length > 0 ? sources : undefined,
        searchQueries: webSearchQueries,
        timestamp: currentIsoTime,
      };

      return res.json(result);
    }
  } catch (geminiError: any) {
    // When Gemini API is unavailable or project credentials are restricted, seamlessly serve deterministic Live Quant Engine
    console.log('[Quant Engine] Generating real-time quantitative structure analysis.');
  }

  // Fallback: Real-time Quantitative Engine with live market data feeds
  try {
    const liveResult = await generateLiveQuantAnalysis({
      timeframe: timeframe as any,
      userNotes,
      userPrice,
      symbol: selectedSymbol,
    });
    return res.json(liveResult);
  } catch (fallbackError: any) {
    console.error('Quant engine fallback failed:', fallbackError);
    return res.status(500).json({
      error: 'ANALYSIS_FAILED',
      message: fallbackError.message || 'Terjadi kesalahan saat memproses data pasar.',
    });
  }
});

// Setup Vite middleware in dev or static serving in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`XAUUSD Quant-Lite Analyst running on http://localhost:${PORT}`);
  });
}

startServer();
