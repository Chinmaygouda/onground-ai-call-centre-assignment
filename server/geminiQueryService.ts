import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_LIVE_FUNCTION_DECLARATIONS, dispatchLiveToolCall } from '../src/services/geminiLive/liveTools';
import { GEMINI_LIVE_SYSTEM_INSTRUCTION } from '../src/services/geminiLive/liveSystemPrompt';

export interface ToolExecutionEvent {
  id: string;
  toolName: string;
  args: Record<string, any>;
  summary: string;
  timestamp: string;
  verified: boolean;
  version?: string;
}

export interface QueryResponsePayload {
  success: boolean;
  answer?: string;
  text?: string;
  toolsExecuted?: ToolExecutionEvent[];
  model?: string;
  error?: string;
  message?: string;
}

export const CANDIDATE_QUERY_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash'
];

export interface ConversationHistoryItem {
  speaker: 'user' | 'assistant';
  text: string;
}

/**
 * Normalizes multi-turn conversation history for Google Gen AI:
 * 1. Ensures first message is strictly 'user'.
 * 2. Merges consecutive same-role turns to enforce strict 'user' -> 'model' alternation.
 * 3. Ensures history ends with 'model' so chat.sendMessage(question) is a valid 'user' message.
 */
export function normalizeGeminiHistory(
  rawHistory?: ConversationHistoryItem[]
): Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> {
  if (!rawHistory || rawHistory.length === 0) return [];

  const rawEntries = rawHistory
    .map((h: any) => {
      const text = (h.text || h.parts?.[0]?.text || '').trim();
      const isUser = h.speaker === 'user' || h.role === 'user';
      return {
        role: (isUser ? 'user' : 'model') as 'user' | 'model',
        text
      };
    })
    .filter((e) => e.text.length > 0);

  if (rawEntries.length === 0) return [];

  const alternating: Array<{ role: 'user' | 'model'; text: string }> = [];

  for (const entry of rawEntries) {
    if (alternating.length === 0) {
      if (entry.role === 'model') {
        alternating.push({
          role: 'user',
          text: 'Hello, I received a call regarding my enquiry on The Sleep Company mattresses.'
        });
      }
      alternating.push(entry);
    } else {
      const last = alternating[alternating.length - 1];
      if (last.role === entry.role) {
        last.text = `${last.text} ${entry.text}`;
      } else {
        alternating.push(entry);
      }
    }
  }

  // Ensure history ends with 'model' so the upcoming chat.sendMessage is a valid 'user' turn
  if (alternating.length > 0 && alternating[alternating.length - 1].role === 'user') {
    alternating.pop();
  }

  return alternating.map((item) => ({
    role: item.role,
    parts: [{ text: item.text }]
  }));
}

/**
 * Execute a query with Gemini and verified multi-turn tool calling with automatic model fallback
 */
export async function executeGeminiQuery(
  question: string,
  apiKey?: string,
  model = 'gemini-3.5-flash-lite',
  history?: ConversationHistoryItem[]
): Promise<{ success: boolean; text: string; answer: string; toolsExecuted: ToolExecutionEvent[]; model: string }> {
  const activeKey = apiKey || process.env.GEMINI_API_KEY;
  if (!activeKey || activeKey === 'your_gemini_api_key_here' || activeKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const ai = new GoogleGenAI({ apiKey: activeKey });
  const formattedHistory = normalizeGeminiHistory(history);

  // Prioritize requested model, then fall back through candidate chain if rate limit or quota is hit
  const modelsToTry = [model, ...CANDIDATE_QUERY_MODELS.filter((m) => m !== model)];
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      const toolsExecuted: ToolExecutionEvent[] = [];
      const chat = ai.chats.create({
        model: currentModel,
        history: formattedHistory.length > 0 ? formattedHistory : undefined,
        config: {
          systemInstruction: {
            parts: [{ text: GEMINI_LIVE_SYSTEM_INSTRUCTION }]
          },
          tools: [{ functionDeclarations: GEMINI_LIVE_FUNCTION_DECLARATIONS as any }]
        }
      });

      let response = await chat.sendMessage({
        message: question
      });

      let iterations = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && iterations < 6) {
        iterations++;
        const functionCalls = response.functionCalls;
        const functionResponses: any[] = [];

        for (const fc of functionCalls) {
          const result = await dispatchLiveToolCall(fc.name, fc.args as Record<string, any>);
          toolsExecuted.push({
            id: Math.random().toString(36).substring(2, 9),
            toolName: fc.name,
            args: fc.args as Record<string, any>,
            summary: `Executed verified tool ${fc.name}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            verified: result.verified !== false,
            version: result.catalogVersion
          });

          functionResponses.push({
            name: fc.name,
            response: result
          });
        }

        response = await chat.sendMessage({
          message: functionResponses.map((fr) => ({
            functionResponse: {
              name: fr.name,
              response: fr.response
            }
          })) as any
        });
      }

      const answer = response.text || 'I have checked our Sleep Company database for you.';
      return {
        success: true,
        text: answer,
        answer,
        toolsExecuted,
        model: currentModel
      };
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || '';
      console.warn(`[GeminiQueryService] Model ${currentModel} error: ${msg.substring(0, 100)}. Checking fallback.`);
      // If error is 429 quota/rate limit or 404, try next model
      if (msg.includes('429') || msg.includes('quota') || msg.includes('404') || msg.includes('no longer available')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All candidate Gemini query models failed.');
}

export async function handleGeminiQueryRequest(
  req: IncomingMessage,
  res: ServerResponse,
  apiKey?: string,
  model = 'gemini-3.5-flash-lite'
) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'POST required' }));
    return;
  }

  const activeKey = apiKey || process.env.GEMINI_API_KEY;
  if (!activeKey || activeKey === 'your_gemini_api_key_here' || activeKey.trim() === '') {
    res.statusCode = 503;
    res.end(
      JSON.stringify({
        success: false,
        error: 'MISSING_GEMINI_API_KEY',
        message: 'GEMINI_API_KEY is not configured on the server.'
      })
    );
    return;
  }

  // Parse JSON body
  let bodyStr = '';
  req.on('data', (chunk) => {
    bodyStr += chunk;
  });

  req.on('end', async () => {
    try {
      const parsed = bodyStr ? JSON.parse(bodyStr) : {};
      const question = (parsed.question || parsed.message || '').trim();

      if (!question) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'EMPTY_QUESTION', message: 'Question cannot be empty' }));
        return;
      }

      const history = Array.isArray(parsed.history)
        ? parsed.history
        : Array.isArray(parsed.conversationHistory)
        ? parsed.conversationHistory
        : undefined;
      const result = await executeGeminiQuery(question, activeKey, model, history);

      const payload: QueryResponsePayload = {
        success: true,
        answer: result.text,
        text: result.text,
        toolsExecuted: result.toolsExecuted,
        model: result.model
      };

      res.statusCode = 200;
      res.end(JSON.stringify(payload));
    } catch (err: any) {
      console.error('[GeminiQueryService] Error executing query:', err?.message || err);
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          success: false,
          error: 'QUERY_EXECUTION_FAILED',
          message: err?.message || 'Failed to process inquiry with Gemini.'
        })
      );
    }
  });
}
