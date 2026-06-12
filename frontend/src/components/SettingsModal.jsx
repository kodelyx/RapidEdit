import React, { useState, useEffect } from 'react';
import { Settings, Key, Check } from 'lucide-react';
import { providerModels, freeProviders, providerLabels, providerPlaceholders, freeProviderLinks } from '../config/providers';

const GitHubIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);

const selectStyle = {
  width: '100%',
  padding: '0.5rem 0.7rem',
  borderRadius: '8px',
  border: '1px solid var(--border-primary)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: '0.78rem',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  outline: 'none'
};

export default function SettingsModal({
  showSettings, setShowSettings,
  selectedProvider, setSelectedProvider,
  selectedModel, setSelectedModel,
  apiKey, setApiKey,
  customApiUrl, setCustomApiUrl,
  customModelName, setCustomModelName,
  freeServerUrl, setFreeServerUrl,
}) {
  const [serverStatus, setServerStatus] = useState(null); // null = checking, true = connected, false = not running

  const isFree = freeProviders.includes(selectedProvider);

  // Health check when settings opens or provider/apiKey changes
  useEffect(() => {
    if (!showSettings) {
      setServerStatus(null);
      return;
    }
    if (selectedProvider === 'other') {
      setServerStatus(null);
      return;
    }
    setServerStatus(null);
    const params = new URLSearchParams({ provider: selectedProvider });
    if (!isFree && apiKey) params.set('api_key', apiKey);
    if (isFree && freeServerUrl) params.set('server_url', freeServerUrl);
    fetch(`/api/health-check?${params}`)
      .then(r => r.json())
      .then(d => setServerStatus(d.connected === true))
      .catch(() => setServerStatus(false));
  }, [showSettings, selectedProvider, apiKey, isFree, freeServerUrl]);

  if (!showSettings) return null;

  const handleProviderChange = (e) => {
    const p = e.target.value;
    setSelectedProvider(p);
    localStorage.setItem('selected_provider', p);
    const models = providerModels[p];
    if (models && models.length > 0) {
      setSelectedModel(models[0].id);
      localStorage.setItem('selected_model', models[0].id);
    }
  };

  return (
    <div className="settings-overlay" onClick={() => setShowSettings(false)}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3><Settings size={16} style={{marginRight: '0.4rem', verticalAlign: 'middle'}} /> Settings</h3>
          <button className="settings-close" onClick={() => setShowSettings(false)}>✕</button>
        </div>
        <div className="settings-body">

          {/* Provider Dropdown */}
          <div className="form-group">
            <label className="form-label">AI Provider</label>
            <select value={selectedProvider} onChange={handleProviderChange} style={selectStyle}>
              <option value="free_gemini">Free Gemini</option>
              <option value="free_chatgpt">Free ChatGPT ⭐ Recommended</option>
              <option value="google">Google</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="groq">Groq</option>
              <option value="other">Other</option>
              <option disabled>──────────</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          {/* Manual Mode Hint */}
          {selectedProvider === 'manual' && (
            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <span className="form-hint" style={{ color: 'var(--text-secondary)', fontSize: '0.66rem' }}>
                Copy prompt & audio → paste to any AI → paste intervals back
              </span>
            </div>
          )}

          {/* Model Dropdown */}
          {selectedProvider !== 'other' && providerModels[selectedProvider]?.length > 0 && (
            <div className="form-group" style={{ marginTop: '0.6rem' }}>
              <label className="form-label">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  localStorage.setItem('selected_model', e.target.value);
                }}
                style={selectStyle}
              >
                {providerModels[selectedProvider].map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* API Key (hidden for free providers) */}
          {!isFree && selectedProvider !== 'other' && (
            <>
              <div className="divider" />
              <div className="form-group">
                <label className="form-label">{providerLabels[selectedProvider] || 'Custom'} API Key</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Key size={14} /></span>
                  <input
                    id="settings-api-key"
                    type="password"
                    placeholder={providerPlaceholders[selectedProvider] || 'your-api-key'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      localStorage.setItem('gemini_api_key', e.target.value);
                    }}
                  />
                </div>
                <span className="form-hint" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>
                    {apiKey
                      ? <><Check size={12} style={{color:'#10b981',verticalAlign:'middle',marginRight:'0.2rem'}} />Key saved</>
                      : 'Required for Auto API mode'}
                  </span>
                  {apiKey && serverStatus !== null && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.6rem', color: serverStatus ? '#10b981' : '#ef4444'
                    }}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: serverStatus ? '#10b981' : '#ef4444',
                        display: 'inline-block',
                        boxShadow: serverStatus ? '0 0 6px #10b981' : 'none'
                      }} />
                      {serverStatus ? 'Valid' : 'Invalid'}
                    </span>
                  )}
                </span>
              </div>
            </>
          )}

          {/* Free Provider Info */}
          {isFree && freeProviderLinks[selectedProvider] && (() => {
            const info = freeProviderLinks[selectedProvider];
            const dotColor = serverStatus === null ? '#f59e0b' : serverStatus ? '#10b981' : '#ef4444';
            const statusText = serverStatus === null ? 'Checking...' : serverStatus ? 'Connected' : 'Not running';
            return (
              <>
                <div style={{
                  padding: '0.5rem 0.7rem',
                  borderRadius: '8px',
                  background: serverStatus ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                  border: `1px solid ${serverStatus ? 'rgba(16, 185, 129, 0.15)' : serverStatus === false ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`,
                  fontSize: '0.66rem',
                  lineHeight: '1.7'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ color: dotColor }}>
                      <Check size={11} style={{ verticalAlign: 'middle', marginRight: '0.2rem' }} />
                      {info.hint}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6rem', color: dotColor }}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: dotColor, display: 'inline-block',
                        boxShadow: serverStatus ? `0 0 6px ${dotColor}` : 'none'
                      }} />
                      {statusText}
                    </span>
                  </div>
                </div>
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label className="form-label">Server URL</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder={info.server || 'http://localhost:8001'}
                    value={freeServerUrl}
                    onChange={(e) => {
                      setFreeServerUrl(e.target.value);
                      localStorage.setItem('free_server_url', e.target.value);
                    }}
                  />
                </div>
                <span className="form-hint" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Enter your local server URL</span>
                  <a
                    href={info.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.6rem', color: 'var(--text-secondary)',
                      textDecoration: 'none', opacity: 0.75, transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0.75}
                  >
                    <GitHubIcon /> GitHub
                  </a>
                </span>
              </div>
              </>
            );
          })()}

          {/* Other - Custom Fields */}
          {selectedProvider === 'other' && (
            <>
              <div className="divider" />
              <div className="form-group">
                <label className="form-label">Custom API Key</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Key size={14} /></span>
                  <input
                    type="password"
                    placeholder="your-api-key"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      localStorage.setItem('gemini_api_key', e.target.value);
                    }}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '0.6rem' }}>
                <label className="form-label">API Endpoint URL</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="https://api.example.com/v1/chat/completions"
                    value={customApiUrl}
                    onChange={(e) => {
                      setCustomApiUrl(e.target.value);
                      localStorage.setItem('custom_api_url', e.target.value);
                    }}
                  />
                </div>
                <span className="form-hint">OpenAI-compatible endpoint</span>
              </div>
              <div className="form-group" style={{ marginTop: '0.6rem' }}>
                <label className="form-label">Model Name</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="e.g. llama-3, mistral, gpt-4o"
                    value={customModelName}
                    onChange={(e) => {
                      setCustomModelName(e.target.value);
                      localStorage.setItem('custom_model_name', e.target.value);
                    }}
                  />
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
