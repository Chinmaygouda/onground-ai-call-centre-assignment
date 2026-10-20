import { executeGeminiQuery } from '../../server/geminiQueryService';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED' }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const question = body.question;
    const history = body.history;

    if (!question || typeof question !== 'string') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'MISSING_QUESTION', message: 'question field is required' }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const result = await executeGeminiQuery(question, apiKey, undefined, history);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: 'QUERY_EXECUTION_FAILED',
        message: err?.message || 'Error executing query',
      }),
    };
  }
};
