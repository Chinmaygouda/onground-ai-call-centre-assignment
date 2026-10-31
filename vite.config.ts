import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleGeminiTokenRequest, handleGeminiStatusRequest, handleGeminiModelsRequest } from './server/geminiTokenService';
import { handleGeminiQueryRequest } from './server/geminiQueryService';
import { handleExotelCallRequest, handleExotelStatusRequest, handleExotelCallbackRequest } from './server/exotelService';
import { attachExotelVoiceServer } from './server/exotelVoiceServer';
import {
  handleTwilioCallRequest,
  handleTwilioCallStatusQuery,
  handleTwilioVoiceWebhook,
  handleTwilioAiTurnWebhook,
  handleTwilioStatusCallbackWebhook
} from './server/twilioService';

function geminiLiveServerPlugin(): Plugin {
  return {
    name: 'gemini-live-token-server',
    configureServer(server) {
      server.middlewares.use('/api/gemini/token', (req, res) => {
        const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
        const activeKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const activeModel = env.GEMINI_LIVE_MODEL || process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
        handleGeminiTokenRequest(req, res, activeKey, activeModel);
      });
      server.middlewares.use('/api/gemini/status', (req, res) => {
        const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
        const activeKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const activeModel = env.GEMINI_LIVE_MODEL || process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
        handleGeminiStatusRequest(req, res, activeKey, activeModel);
      });
      server.middlewares.use('/api/gemini/models', (req, res) => {
        const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
        const activeKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const activeModel = env.GEMINI_LIVE_MODEL || process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
        handleGeminiModelsRequest(req, res, activeKey, activeModel);
      });
      server.middlewares.use('/api/gemini/query', (req, res) => {
        const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
        const activeKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        handleGeminiQueryRequest(req, res, activeKey);
      });
      // Exotel Telephony Endpoints
      server.middlewares.use('/api/exotel/call', (req, res) => {
        const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
        handleExotelCallRequest(req, res, env);
      });
      server.middlewares.use('/api/exotel/call-status', (req, res) => {
        const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
        handleExotelStatusRequest(req, res, env);
      });
      server.middlewares.use('/api/exotel/callback', (req, res) => {
        const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
        handleExotelCallbackRequest(req, res, env);
      });
      // Twilio Telephony Endpoints
      server.middlewares.use('/api/twilio/call', (req, res) => {
        const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
        handleTwilioCallRequest(req, res, env);
      });
      server.middlewares.use('/api/twilio/call-status', (req, res) => {
        const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
        handleTwilioCallStatusQuery(req, res, env);
      });
      server.middlewares.use('/api/twilio/voice', (req, res) => {
        const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
        handleTwilioVoiceWebhook(req, res, env);
      });
      server.middlewares.use('/api/twilio/ai-turn', (req, res) => {
        const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
        handleTwilioAiTurnWebhook(req, res, env);
      });
      server.middlewares.use('/api/twilio/status', (req, res) => {
        const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
        handleTwilioStatusCallbackWebhook(req, res, env);
      });
      // Attach Exotel Voicebot WebSocket Server
      if (server.httpServer) {
        attachExotelVoiceServer(server.httpServer, '/exotel-voicebot');
      }
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/gemini/token', (req, res) => {
        const env = loadEnv('production', process.cwd(), '');
        const activeKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const activeModel = env.GEMINI_LIVE_MODEL || process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
        handleGeminiTokenRequest(req, res, activeKey, activeModel);
      });
      server.middlewares.use('/api/gemini/status', (req, res) => {
        const env = loadEnv('production', process.cwd(), '');
        const activeKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const activeModel = env.GEMINI_LIVE_MODEL || process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
        handleGeminiStatusRequest(req, res, activeKey, activeModel);
      });
      server.middlewares.use('/api/gemini/models', (req, res) => {
        const env = loadEnv('production', process.cwd(), '');
        const activeKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const activeModel = env.GEMINI_LIVE_MODEL || process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
        handleGeminiModelsRequest(req, res, activeKey, activeModel);
      });
      server.middlewares.use('/api/gemini/query', (req, res) => {
        const env = loadEnv('production', process.cwd(), '');
        const activeKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        handleGeminiQueryRequest(req, res, activeKey);
      });
      // Exotel Telephony Endpoints (Preview)
      server.middlewares.use('/api/exotel/call', (req, res) => {
        const env = loadEnv('production', process.cwd(), '');
        handleExotelCallRequest(req, res, env);
      });
      server.middlewares.use('/api/exotel/call-status', (req, res) => {
        const env = loadEnv('production', process.cwd(), '');
        handleExotelStatusRequest(req, res, env);
      });
      server.middlewares.use('/api/exotel/callback', (req, res) => {
        const env = loadEnv('production', process.cwd(), '');
        handleExotelCallbackRequest(req, res, env);
      });
      // Twilio Telephony Endpoints (Preview)
      server.middlewares.use('/api/twilio/call', (req, res) => {
        const env = loadEnv('production', process.cwd(), '');
        handleTwilioCallRequest(req, res, env);
      });
      server.middlewares.use('/api/twilio/call-status', (req, res) => {
        const env = loadEnv('production', process.cwd(), '');
        handleTwilioCallStatusQuery(req, res, env);
      });
      server.middlewares.use('/api/twilio/voice', (req, res) => {
        const env = loadEnv('production', process.cwd(), '');
        handleTwilioVoiceWebhook(req, res, env);
      });
      server.middlewares.use('/api/twilio/ai-turn', (req, res) => {
        const env = loadEnv('production', process.cwd(), '');
        handleTwilioAiTurnWebhook(req, res, env);
      });
      server.middlewares.use('/api/twilio/status', (req, res) => {
        const env = loadEnv('production', process.cwd(), '');
        handleTwilioStatusCallbackWebhook(req, res, env);
      });
      // Attach Exotel Voicebot WebSocket Server (Preview)
      if (server.httpServer) {
        attachExotelVoiceServer(server.httpServer, '/exotel-voicebot');
      }
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      geminiLiveServerPlugin()
    ],
    server: {
      port: 5173,
      host: true,
    },
  };
});
