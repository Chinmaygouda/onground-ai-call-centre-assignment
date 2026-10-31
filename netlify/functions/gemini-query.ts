import { executeGeminiQuery } from '../../server/geminiQueryService';

const jsonHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const raw = await req.text();
    const body = raw ? JSON.parse(raw) : {};
    const question = body.question;
    const history = body.history;

    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'MISSING_QUESTION', message: 'question field is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const result = await executeGeminiQuery(question, apiKey, undefined, history);

    return new Response(JSON.stringify(result), { status: 200, headers: jsonHeaders });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'QUERY_EXECUTION_FAILED',
        message: err?.message || 'Error executing query',
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
