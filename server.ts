import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

const SUPPORT_SYSTEM_INSTRUCTION = `You are the specialized AI Support Assistant for Decisiq 360 — a premium financial intelligence workspace.
Your mission is to guide users, troubleshoot issues, explain features, and clarify financial analysis across the four independent intelligence modules.

Key Product Architecture:
1. Reconciliation Intelligence (Yellow accent): Compares bank statements with general ledgers or ERP records. Detects exact matches, tolerance discrepancies, missing items, and calculates net residual variances.
2. Decision Intelligence (Green accent): Audits retail credit underwriting applications against deterministic policy rules (such as Debt-to-Income ≤ 43%, FICO score ≥ 640, employment stability). Identifies discretionary overrides and policy conflicts.
3. Risk & Exposure Intelligence (Pink accent): Monitors institutional counterparty exposure, credit limit utilization, gross/net variances across treasury vs ERP ledgers, and models proportional FX/credit stress shock scenarios.
4. Close Intelligence (Purple accent): Analyzes month-end task dependencies using Critical Path Method (CPM), detects circular prerequisite loops (cycles), identifies blockers, and estimates cycle completion time.

File Ingestion Capabilities:
- Supported formats: CSV (.csv), Excel (.xlsx, .xls), and JSON (.json).
- Max file size: 25 MB per file.
- Client-side deterministic normalization with offline-first persistence.
- Each module has an isolated document collection and clear/reset functionality with zero leakage across modules.

Tone and Guidelines:
- Professional, clear, concise, and helpful.
- Provide step-by-step guidance.
- When explaining findings, explain financial metrics in plain language.
- Never pretend you have modified database records or executed an upload if it did not happen.
- If an issue requires official escalation, provide the support contact: support@decisiq360.com.`;

// API endpoint for Gemini-powered support assistant
app.post('/api/support', async (req, res) => {
  const { message, history, context } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // If Gemini client is available and API key is present
  if (geminiClient && process.env.GEMINI_API_KEY) {
    try {
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      // Add recent conversation history if provided
      if (Array.isArray(history)) {
        for (const item of history.slice(-6)) {
          if (item.sender === 'user') {
            contents.push({ role: 'user', parts: [{ text: item.text }] });
          } else if (item.sender === 'bot') {
            contents.push({ role: 'model', parts: [{ text: item.text }] });
          }
        }
      }

      // Add current user prompt with context if available
      let contextualPrompt = message;
      if (context && typeof context === 'object') {
        contextualPrompt = `[User Workspace Context: Current Active Module = ${context.activeModule || 'Home'}, Has Active Results = ${Boolean(context.hasResults)}]\n\nUser Question: ${message}`;
      }
      contents.push({ role: 'user', parts: [{ text: contextualPrompt }] });

      const response = await geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: SUPPORT_SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      const reply = response.text || 'I am ready to help you with Decisiq 360.';
      return res.json({ reply, provider: 'gemini' });
    } catch (err: any) {
      console.error('Gemini API call failed, falling back to deterministic response:', err.message);
      // Fall through to deterministic fallback response
    }
  }

  // Deterministic fallback response if Gemini is offline / unavailable
  const reply = getDeterministicSupportResponse(message, context);
  return res.json({ reply, provider: 'offline_fallback' });
});

function getDeterministicSupportResponse(message: string, context?: any): string {
  const q = message.toLowerCase();

  if (q.includes('upload') || q.includes('format') || q.includes('file')) {
    return `### Uploading Data to Decisiq 360
1. Navigate to the relevant module workspace (Reconciliation, Decision, Risk, or Close).
2. Drag and drop your file into the designated upload slot, or click to browse.
3. Supported formats: **CSV (.csv)**, **Excel (.xlsx, .xls)**, and **JSON (.json)** up to **25 MB**.
4. Once your files are uploaded, click the action button to execute the calculation pipeline.`;
  }

  if (q.includes('reconciliation') || q.includes('mismatch') || q.includes('discrepancy')) {
    return `### Reconciliation Intelligence
- **Purpose**: Compares primary bank/settlement records against general ledger records.
- **Matching Logic**: Uses transaction references, timestamps, and inverse debit/credit signs.
- **Discrepancies**: Flags transactions where values differ by more than the configured tolerance (default $0.05).
- **Resolution**: Use the "Audit Trace" action to inspect line items, or click "AI Investigation" for automated root-cause analysis.`;
  }

  if (q.includes('decision') || q.includes('underwrite') || q.includes('credit') || q.includes('policy')) {
    return `### Decision Intelligence
- **Purpose**: Audits credit applications against deterministic underwriting rules.
- **Standard Rules**: Maximum Debt-to-Income (DTI) of 43%, minimum FICO score of 640, minimum 12 months employment.
- **Conflicts**: Flags divergent overrides where an applicant was marked "Approved" in the source system despite violating underwriting thresholds.
- **Audit Findings**: Detailed rule breakdowns show exact formulas and evidence rows.`;
  }

  if (q.includes('risk') || q.includes('exposure') || q.includes('limit')) {
    return `### Risk & Exposure Intelligence
- **Purpose**: Analyzes credit and market risk across counterparties and portfolios.
- **Concentration**: Measures counterparty exposure share and flags institutions holding > 20% of gross capital.
- **Stress Scenarios**: Run real-time FX rate shocks and credit spread widening tests to view simulated capital impact without modifying base data.`;
  }

  if (q.includes('close') || q.includes('task') || q.includes('critical path') || q.includes('blocker')) {
    return `### Close Intelligence
- **Purpose**: Tracks month-end financial task sequences and predicts completion milestones.
- **Critical Path (CPM)**: Computes the earliest possible close time based on serial dependencies.
- **Blockers & Cycles**: Immediately halts schedule projection if circular prerequisites are found and highlights the exact prerequisite loop to fix.`;
  }

  if (q.includes('clear') || q.includes('reset') || q.includes('delete')) {
    return `### Workspace Clear & Reset
- Each of the four modules has an independent **"Clear All"** button located in the upload header.
- Clicking "Clear All" prompts a confirmation dialog and resets only the active module's data and cache.
- Other modules and the immutable audit log are **strictly preserved**.`;
  }

  return `Decisiq 360 provides four specialized financial engines:
- **Reconciliation Intelligence**: Detects transaction mismatches between bank statements and ledgers.
- **Decision Intelligence**: Explains credit underwriting verdicts and flags policy conflicts.
- **Risk & Exposure Intelligence**: Monitors concentration, limit breaches, and runs scenario stress tests.
- **Close Intelligence**: Visualizes month-end closing task dependencies and critical path schedules.

Feel free to ask questions like:
- *"How do I upload my data?"*
- *"Explain policy conflicts in Decision Intelligence"*
- *"What formats are supported?"*
- *"How does the Clear All feature isolate data?"*`;
}

// Dev & Production serving
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Decisiq 360 server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
