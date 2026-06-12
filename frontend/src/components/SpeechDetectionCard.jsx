import React from 'react';
import { Bot, Key, Check, Clipboard } from 'lucide-react';
import { freeProviders } from '../config/providers';

function SpeechDetectionCard({
  mode,
  promptTemplate,
  copySuccess,
  handleCopyPrompt,
  apiKey,
  setApiKey,
  handleDetectIntervals,
  isDetectingIntervals,
  selectedProvider
}) {
  const isFree = freeProviders.includes(selectedProvider);
  const canDetect = isFree || !!apiKey;

  return (
    <div className="card card-compact">
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
        <span className="icon"><Bot size={16} /></span>
        Speech Interval Detection
      </div>
      
      {mode === 'manual' ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            
            {/* Step 1 */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '18px', 
                height: '18px', 
                borderRadius: '50%', 
                background: 'rgba(16, 185, 129, 0.12)', 
                color: 'var(--text-accent)', 
                fontSize: '0.68rem', 
                fontWeight: '800',
                flexShrink: 0,
                marginTop: '0.1rem'
              }}>1</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text-primary)' }}>Download Audio Track</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Download the extracted <code style={{ color: 'var(--text-accent)', background: 'var(--bg-elevated)', padding: '1px 4px', borderRadius: '3px', fontSize: '0.65rem' }}>audio.mp3</code> from the left card.</span>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '18px', 
                height: '18px', 
                borderRadius: '50%', 
                background: 'rgba(16, 185, 129, 0.12)', 
                color: 'var(--text-accent)', 
                fontSize: '0.68rem', 
                fontWeight: '800',
                flexShrink: 0,
                marginTop: '0.1rem'
              }}>2</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text-primary)' }}>Copy AI Prompt</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Click the button below to copy the speech detection prompt.</span>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '18px', 
                height: '18px', 
                borderRadius: '50%', 
                background: 'rgba(16, 185, 129, 0.12)', 
                color: 'var(--text-accent)', 
                fontSize: '0.68rem', 
                fontWeight: '800',
                flexShrink: 0,
                marginTop: '0.1rem'
              }}>3</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text-primary)' }}>Analyze with LLM</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Upload track + prompt to ChatGPT, Gemini, or any AI to get intervals.</span>
              </div>
            </div>

          </div>

          <button 
            className="btn btn-primary btn-sm" 
            onClick={handleCopyPrompt}
            style={{ width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            {copySuccess ? <><Check size={13} /> Prompt Copied!</> : <><Clipboard size={13} /> Copy AI Prompt</>}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <button
            id="detect-intervals-btn"
            className="btn btn-accent"
            onClick={handleDetectIntervals}
            disabled={isDetectingIntervals || !canDetect}
            style={{ width: '100%', marginTop: 'auto' }}
          >
            {isDetectingIntervals ? (
              <>
                <span className="spinner" />
                Analyzing speech...
              </>
            ) : (
              <><Bot size={14} /> Auto-Detect Speech</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default SpeechDetectionCard;
