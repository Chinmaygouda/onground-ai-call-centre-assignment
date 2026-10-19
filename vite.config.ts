import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleGeminiTokenRequest, handleGeminiStatusRequest, handleGeminiModelsRequest } from './server/geminiTokenService';

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
