import React, { useState, useEffect } from 'react';
import { Settings, Sun, Moon, Download, Upload, FileVideo, HardDrive, Clock, X, ChevronRight, Check, Key, Clipboard, Bot, Zap } from 'lucide-react';
import './App.css';
import LoadedVideoCard from './components/LoadedVideoCard';
import AudioTrackCard from './components/AudioTrackCard';
import SpeechDetectionCard from './components/SpeechDetectionCard';
import PasteIntervalsCard from './components/PasteIntervalsCard';
import RenderExportCard from './components/RenderExportCard';
import SettingsModal from './components/SettingsModal';
import { freeProviders } from './config/providers';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [view, setView] = useState('editor');
  const [videoPath, setVideoPath] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [audioPath, setAudioPath] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [selectedProvider, setSelectedProvider] = useState(() => {
    return localStorage.getItem('selected_provider') || 'google';
  });
  const mode = selectedProvider === 'manual' ? 'manual' : (apiKey || freeProviders.includes(selectedProvider)) ? 'auto' : 'manual';
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('selected_model') || 'gemini-3.5-flash';
  });
  const [customApiUrl, setCustomApiUrl] = useState(() => {
    return localStorage.getItem('custom_api_url') || '';
  });
  const [customModelName, setCustomModelName] = useState(() => {
    return localStorage.getItem('custom_model_name') || '';
  });
  const [freeServerUrl, setFreeServerUrl] = useState(() => {
    return localStorage.getItem('free_server_url') || '';
  });


  const [rawAiResponse, setRawAiResponse] = useState('');
  const [intervals, setIntervals] = useState(null);
  const [renderLogs, setRenderLogs] = useState([]);
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);
  const [isDetectingIntervals, setIsDetectingIntervals] = useState(false);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [outputVideoUrl, setOutputVideoUrl] = useState('');
  const [outputVideoPath, setOutputVideoPath] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [tempVideoInfo, setTempVideoInfo] = useState(null);
  const [heroVideoAspect, setHeroVideoAspect] = useState('landscape');

  const readIntervalsFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setRawAiResponse(text);
      const parsed = parseIntervals(text);
      if (parsed) {
        setIntervals(parsed);
        setView('render');
      } else {
        setIntervals(null);
      }
    };
    reader.readAsText(file);
  };

  const handleIntervalsFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      readIntervalsFile(file);
    }
  };

  const handleConfirmVideo = () => {
    if (tempVideoInfo) {
      setVideoInfo(tempVideoInfo);
      setAudioPath('');
      setAudioUrl('');
      setIntervals(null);
      setRawAiResponse('');
      setOutputVideoUrl('');
      setOutputVideoPath('');
      setView('editor');
    }
  };

  const handleDownloadAudio = async (e) => {
    e.preventDefault();
    if (!audioUrl) return;
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.download = audioPath ? 'audio.' + audioPath.split('.').pop() : 'audio.mp3';
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      window.open(audioUrl, '_blank');
    }
  };

  useEffect(() => {
    fetchPrompt();
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchPrompt = async () => {
    try {
      const res = await fetch('/api/prompt-template');
      const data = await res.json();
      setPromptTemplate(data.prompt);
    } catch (e) {
      console.error('Failed to load prompt template', e);
    }
  };

  const handleFileSelection = async (file) => {
    if (!file) return;
    
    // Create local preview URL
    const previewUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(previewUrl);
    setVideoPath(file.name); // Temporarily set to filename
    setIsUploading(true);
    setTempVideoInfo(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert(`Upload failed: ${err.detail}`);
        return;
      }
      
      const data = await res.json();
      setVideoPath(data.path);

      // Fetch metadata immediately in background for preview card info
      const infoRes = await fetch('/api/video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_path: data.path }),
      });
      
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        setTempVideoInfo(infoData);
      }
    } catch (e) {
      alert(`Upload connection failed: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveVideo = () => {
    setVideoInfo(null);
    setVideoPreviewUrl('');
    setVideoPath('');
    setTempVideoInfo(null);
    setAudioPath('');
    setAudioUrl('');
    setIntervals(null);
    setRawAiResponse('');
    setOutputVideoUrl('');
    setOutputVideoPath('');
    setView('editor');
  };

  const handleLoadVideo = async () => {
    if (!videoPath) return;
    try {
      const res = await fetch('/api/video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_path: videoPath }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
        return;
      }
      const data = await res.json();
      setVideoInfo(data);
      setAudioPath('');
      setAudioUrl('');
      setIntervals(null);
      setRawAiResponse('');
      setOutputVideoUrl('');
      setOutputVideoPath('');
      setView('editor');
    } catch (e) {
      alert(`Connection failed: ${e.message}`);
    }
  };

  const handleExtractAudio = async () => {
    if (!videoInfo) return;
    setIsExtractingAudio(true);
    try {
      const res = await fetch('/api/extract-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_path: videoInfo.path }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
        return;
      }
      const data = await res.json();
      setAudioUrl(data.audio_url);
      setAudioPath(data.audio_path);
    } catch (e) {
      alert(`Audio extraction failed: ${e.message}`);
    } finally {
      setIsExtractingAudio(false);
    }
  };

  const parseIntervals = (text) => {
    let content = text.trim();
    const codeMatch = content.match(/```(?:json|python)?\s*([\s\S]+?)\s*```/);
    if (codeMatch) {
      content = codeMatch[1];
    }

    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.map(([s, e]) => [parseFloat(s), parseFloat(e)]);
      } else if (parsed.intervals && Array.isArray(parsed.intervals)) {
        return parsed.intervals.map(([s, e]) => [parseFloat(s), parseFloat(e)]);
      }
    } catch (e) {}

    try {
      const cleanContent = content.replace(/#.*/g, '');
      const listMatch = cleanContent.match(/\[\s*[\s\S]*\s*\]/);
      if (listMatch) {
        const numbers = listMatch[0].match(/(?:\[|\()\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:\]|\))/g);
        if (numbers) {
          return numbers.map(pair => {
            const match = pair.match(/(\d+(?:\.\d+)?)/g);
            return [parseFloat(match[0]), parseFloat(match[1])];
          });
        }
      }
    } catch (e) {}

    const pairs = content.match(/(?:\[|\()\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:\]|\))/g);
    if (pairs) {
      return pairs.map(pair => {
        const match = pair.match(/(\d+(?:\.\d+)?)/g);
        return [parseFloat(match[0]), parseFloat(match[1])];
      });
    }

    return null;
  };

  const handleRawInputChange = (e) => {
    const text = e.target.value;
    setRawAiResponse(text);
    const parsed = parseIntervals(text);
    if (parsed) {
      setIntervals(parsed);
      setView('render');
    } else {
      setIntervals(null);
    }
  };

  const handleDetectIntervals = async () => {
    if (!apiKey && !freeProviders.includes(selectedProvider)) {
      alert('Please enter your API Key first.');
      return;
    }
    localStorage.setItem('gemini_api_key', apiKey);
    setIsDetectingIntervals(true);

    try {
      const res = await fetch('/api/detect-intervals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          audio_path: audioPath,
          provider: selectedProvider,
          model: selectedModel,
          custom_api_url: customApiUrl || undefined,
          custom_model_name: customModelName || undefined,
          server_url: freeServerUrl || undefined
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`AI Error: ${err.detail}`);
        return;
      }

      const data = await res.json();
      setRawAiResponse(data.raw_output);
      if (data.intervals) {
        setIntervals(data.intervals);
        setView('render');
      } else {
        alert('Could not automatically parse intervals from raw AI response.');
      }
    } catch (e) {
      alert(`AI Detection failed: ${e.message}`);
    } finally {
      setIsDetectingIntervals(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptTemplate);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleRenderVideo = async () => {
    if (!videoInfo || !intervals) return;
    setIsRenderingVideo(true);
    setRenderLogs([]);
    setOutputVideoUrl('');
    setOutputVideoPath('');

    try {
      const response = await fetch('/api/run-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: videoInfo.path,
          intervals: intervals
        }),
      });

      if (!response.body) {
        alert('Empty stream returned from server.');
        setIsRenderingVideo(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value);
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr.startsWith('[COMPLETED]')) {
              const result = JSON.parse(dataStr.replace('[COMPLETED] ', ''));
              setOutputVideoUrl(result.video_url);
              setOutputVideoPath(result.video_path);
            } else if (dataStr.startsWith('[FAILED]')) {
              setRenderLogs(prev => [...prev, `❌ Error: ${dataStr}`]);
            } else {
              setRenderLogs(prev => [...prev, dataStr]);
            }
          }
        }
      }
    } catch (e) {
      setRenderLogs(prev => [...prev, `❌ Stream connection error: ${e.message}`]);
    } finally {
      setIsRenderingVideo(false);
    }
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const currentStep = !videoInfo ? 0 : !audioUrl ? 1 : !intervals ? 2 : !outputVideoUrl ? 3 : 4;

  return (
    <div className="app-container">
      {/* ═══ HEADER ═══ */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <div className="title-row">
              <img src="/logo.png" alt="RapidEdit Logo" className="logo-img" />
              <h1 className="title-text">RapidEdit</h1>
            </div>
            <p className="subtitle-text">
              Your automated video editor.
            </p>
          </div>
          <div className="header-right-actions">
            <div className="header-badge" title="System Ready">
              <span className="dot" />
            </div>
            <button 
              className="theme-toggle-btn" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="settings-btn" onClick={() => setShowSettings(!showSettings)} title="Settings">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ═══ SETTINGS MODAL ═══ */}
      <SettingsModal
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        apiKey={apiKey}
        setApiKey={setApiKey}
        customApiUrl={customApiUrl}
        setCustomApiUrl={setCustomApiUrl}
        customModelName={customModelName}
        setCustomModelName={setCustomModelName}
        freeServerUrl={freeServerUrl}
        setFreeServerUrl={setFreeServerUrl}
      />

      {/* ═══ HERO UPLOAD SECTION ═══ */}
      {!videoInfo && (
        <div className="hero-upload">
          <div className="card hero-upload-card">
            {!videoPreviewUrl && !isUploading ? (
              <div
                className={`drop-zone drop-zone-hero ${isDragging ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelection(file);
                }}
                onClick={() => document.getElementById('file-select-input').click()}
              >
                <input
                  id="file-select-input"
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleFileSelection(file);
                  }}
                />
                <div className="drop-zone-icon">{isDragging ? <Download size={36} /> : <Upload size={36} />}</div>
                <div className="drop-zone-text">
                  {isDragging ? 'Drop video here' : 'Drag & drop your video file'}
                </div>
                <div className="drop-zone-hint">MP4, MOV, MKV, AVI — or click to browse</div>
              </div>
            ) : (
              <div className="selected-preview-container">
                <div className={`preview-player-wrapper preview-${heroVideoAspect}`}>
                  {videoPreviewUrl && (
                    <video 
                      src={videoPreviewUrl} 
                      controls 
                      className="hero-video-preview" 
                      onLoadedMetadata={(e) => {
                        const { videoWidth, videoHeight } = e.target;
                        if (videoWidth && videoHeight) {
                          const ratio = videoWidth / videoHeight;
                          if (ratio < 0.8) {
                            setHeroVideoAspect('portrait');
                          } else if (ratio > 1.25) {
                            setHeroVideoAspect('landscape');
                          } else {
                            setHeroVideoAspect('square');
                          }
                        }
                      }}
                    />
                  )}
                  {isUploading && (
                    <div className="upload-overlay">
                      <span className="spinner" />
                      <p>Uploading to local engine...</p>
                    </div>
                  )}
                </div>
                
                <div className="preview-meta-row">
                  <div className="file-info">
                    <FileVideo size={16} style={{color: 'var(--text-accent)'}} />
                    <span className="filename-text">{videoPath.split('/').pop()}</span>
                  </div>
                  <button 
                    className="btn btn-secondary btn-sm"
                    disabled={isUploading}
                    onClick={() => {
                      setVideoPreviewUrl('');
                      setVideoPath('');
                      setTempVideoInfo(null);
                    }}
                  >
                    <X size={13} /> Remove
                  </button>
                </div>

                {tempVideoInfo && (
                  <div className="preview-info-grid" style={{ marginTop: '0.2rem', marginBottom: '0.25rem' }}>
                    <div className="info-item">
                      <HardDrive size={14} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">Size</span>
                        <span className="info-value">{tempVideoInfo.size_mb} MB</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <Clock size={14} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">Duration</span>
                        <span className="info-value">{formatDuration(tempVideoInfo.duration_sec)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {!isUploading && tempVideoInfo && (
                  <button
                    className="btn btn-primary"
                    onClick={handleConfirmVideo}
                    style={{ marginTop: '0.4rem' }}
                  >
                    Proceed to Editor <ChevronRight size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ DASHBOARD (after video loaded) ═══ */}
      {videoInfo && (
        <>
          {/* Horizontal Progress */}
          <div className="card progress-horizontal-card">
            <div className="progress-steps-horizontal">
              {[
                { num: 1, title: 'Load Video', desc: 'Select source' },
                { num: 2, title: 'Extract Audio', desc: 'FFmpeg track' },
                { num: 3, title: 'Get Intervals', desc: 'AI speech detection' },
                { num: 4, title: 'Render Output', desc: 'GPU-accelerated cut' },
              ].map((step, idx) => (
                <React.Fragment key={step.num}>
                  <div className={`progress-step-item ${currentStep >= step.num ? 'active' : ''}`}>
                    <div
                      className="step-number-bubble"
                      style={{
                        background: currentStep > step.num
                          ? 'linear-gradient(135deg, #059669, #10b981)'
                          : currentStep === step.num
                          ? 'linear-gradient(135deg, #059669, #10b981)'
                          : 'var(--bg-elevated)',
                        border: currentStep < step.num ? '1px solid var(--border-primary)' : 'none',
                        boxShadow: currentStep === step.num ? '0 2px 10px rgba(16, 185, 129, 0.3)' : 'none',
                      }}
                    >
                      {currentStep > step.num ? '✓' : step.num}
                    </div>
                    <div className="step-text-block">
                      <span className="step-title">{step.title}</span>
                      <span className="step-desc">{step.desc}</span>
                    </div>
                  </div>
                  {idx < 3 && (
                    <div className={`step-connector ${currentStep > step.num ? 'active' : ''}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {view === 'render' ? (
            <div className="render-view-container">
              <div style={{ marginBottom: '1.25rem' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setView('editor')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  ← Back to Editor
                </button>
              </div>
              {intervals && (
                <RenderExportCard 
                  intervals={intervals}
                  videoInfo={videoInfo}
                  renderLogs={renderLogs}
                  isRenderingVideo={isRenderingVideo}
                  handleRenderVideo={handleRenderVideo}
                  outputVideoUrl={outputVideoUrl}
                  outputVideoPath={outputVideoPath}
                  formatDuration={formatDuration}
                />
              )}
            </div>
          ) : (
            <div className="dashboard-layout">
              <aside className="sidebar">
                <LoadedVideoCard 
                  videoInfo={videoInfo}
                  videoPreviewUrl={videoPreviewUrl}
                  handleRemoveVideo={handleRemoveVideo}
                  handleFileSelection={handleFileSelection}
                  formatDuration={formatDuration}
                />
              </aside>

              <main className="main-workspace">
                <div className="step-grid-row">
                  <AudioTrackCard 
                    audioUrl={audioUrl}
                    audioPath={audioPath}
                    isExtractingAudio={isExtractingAudio}
                    handleExtractAudio={handleExtractAudio}
                    handleDownloadAudio={handleDownloadAudio}
                    formatDuration={formatDuration}
                  />
                  {audioUrl && (
                    <>
                      <SpeechDetectionCard 
                        mode={mode}
                        promptTemplate={promptTemplate}
                        copySuccess={copySuccess}
                        handleCopyPrompt={handleCopyPrompt}
                        apiKey={apiKey}
                        setApiKey={setApiKey}
                        handleDetectIntervals={handleDetectIntervals}
                        isDetectingIntervals={isDetectingIntervals}
                        selectedProvider={selectedProvider}
                      />
                      <PasteIntervalsCard 
                        rawAiResponse={rawAiResponse}
                        handleRawInputChange={handleRawInputChange}
                        readIntervalsFile={readIntervalsFile}
                        handleIntervalsFileChange={handleIntervalsFileChange}
                        intervals={intervals}
                      />
                    </>
                  )}
                </div>
              </main>
            </div>
          )}
      </>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer className="app-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Built by</span>
          <a href="https://github.com/kodelyx/RapidEdit" target="_blank" rel="noopener noreferrer" style={{ fontWeight: '600' }}>
            Kodelyx
          </a>
          <a 
            href="https://github.com/kodelyx/RapidEdit" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '0.2rem' }}
            title="View Source on GitHub"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
