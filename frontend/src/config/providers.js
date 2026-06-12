export const providerModels = {
  free_gemini: [
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
  ],
  free_chatgpt: [
    { id: 'gpt-5.5', name: 'GPT-5.5' },
  ],
  google: [
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
    { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro' },
    { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  ],
  openai: [
    { id: 'gpt-5.5', name: 'GPT-5.5' },
    { id: 'gpt-5.4', name: 'GPT-5.4' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
    { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano' },
  ],
  anthropic: [
    { id: 'claude-fable-5', name: 'Claude Fable 5' },
    { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
  ],
  groq: [
    { id: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
    { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B' },
    { id: 'qwen-qwq-32b', name: 'Qwen QwQ 32B' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  ],
  other: []
};

export const freeProviders = ['free_gemini', 'free_chatgpt'];

export const providerLabels = {
  free_gemini: 'Free Gemini',
  free_chatgpt: 'Free ChatGPT',
  google: 'Google',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  groq: 'Groq',
  other: 'Custom',
};

export const providerPlaceholders = {
  google: 'AIzaSy...',
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  groq: 'gsk_...',
  other: 'your-api-key',
};

export const freeProviderLinks = {
  free_gemini: {
    hint: 'Gemini account via Chrome extension',
    url: 'https://github.com/kodelyx/free-gemini-api',
    server: 'http://localhost:8001',
    api: 'POST /chat',
    curl: 'curl -X POST http://localhost:8001/chat -H "Content-Type: application/json" -d \'{"prompt":"hello","user_id":"test","new_chat":true}\'',
  },
  free_chatgpt: {
    hint: 'ChatGPT account via Chrome extension',
    url: 'https://github.com/kodelyx/chatgpt-free-api',
    server: 'http://localhost:9225',
    api: 'POST /chat',
    curl: 'curl -X POST http://localhost:8002/chat -H "Content-Type: application/json" -d \'{"prompt":"hello","user_id":"test","new_chat":true}\'',
  },
};
