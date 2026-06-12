import React, { useState, useEffect, useRef } from 'react';
import { Music, RefreshCw, Play, Pause, Download } from 'lucide-react';

function AudioTrackCard({
  audioUrl,
  audioPath,
  isExtractingAudio,
  handleExtractAudio,
  handleDownloadAudio,
  formatDuration
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  
  const audioRef = useRef(null);

  useEffect(() => {
    setIsPlaying(false);
    setAudioCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.log(err));
      setIsPlaying(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioSeek = (e) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setAudioCurrentTime(val);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioCurrentTime(0);
  };

  return (
    <div className="card card-compact">
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="icon"><Music size={16} /></span>
          Audio Track
        </div>
        {audioUrl && (
          <button 
            className="sidebar-card-action-btn"
            onClick={handleExtractAudio}
            disabled={isExtractingAudio}
            title="Re-extract Audio"
          >
            <RefreshCw size={13} className={isExtractingAudio ? 'spin' : ''} />
          </button>
        )}
      </div>

      {!audioUrl ? (
        isExtractingAudio ? (
          <div 
            className="extraction-loading-view compact-loading"
            style={{
              background: 'rgba(16, 185, 129, 0.05)',
              borderRadius: '24px',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              padding: '0.8rem 1rem',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div className="audio-wave-anim-container">
              {[...Array(8)].map((_, i) => (
                <span 
                  key={i} 
                  className={`wave-bar bar-${i + 1}`} 
                  style={{ borderRadius: '9999px' }}
                />
              ))}
            </div>
            <p className="extraction-status-text font-semibold" style={{ fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>Extracting track...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '0.2rem 0' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: '0' }}>
              Extract the audio track from the loaded video to run speech pattern detection.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '50%', 
                  background: 'rgba(16, 185, 129, 0.12)', 
                  color: 'var(--text-accent)', 
                  fontSize: '0.62rem', 
                  fontWeight: '800',
                  flexShrink: 0,
                  marginTop: '0.1rem'
                }}>1</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Click <strong>Extract Audio</strong> below to start.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '50%', 
                  background: 'rgba(16, 185, 129, 0.12)', 
                  color: 'var(--text-accent)', 
                  fontSize: '0.62rem', 
                  fontWeight: '800',
                  flexShrink: 0,
                  marginTop: '0.1rem'
                }}>2</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>FFmpeg will extract audio locally.</span>
              </div>
            </div>
            <button 
              className="btn btn-primary btn-sm"
              onClick={handleExtractAudio}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.2rem' }}
            >
              <Music size={13} /> Extract Audio
            </button>
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <audio 
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleAudioTimeUpdate}
            onLoadedMetadata={handleAudioLoadedMetadata}
            onEnded={handleAudioEnded}
            style={{ display: 'none' }}
          />

          {/* Circular Visualizer */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.4rem 0' }}>
            <div style={{
              position: 'relative',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.04)',
              border: '1px solid rgba(16, 185, 129, 0.1)',
              overflow: 'hidden'
            }}>
              {/* Play button */}
              <button 
                onClick={togglePlay}
                style={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  border: 'none',
                  outline: 'none',
                  background: 'var(--text-accent)', 
                  color: '#fff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 2
                }}
              >
                {isPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
              </button>

              {/* Radial bars */}
              {[...Array(20)].map((_, i) => {
                const angle = (i / 20) * 360;
                return (
                  <span 
                    key={i}
                    className={`visualizer-bar bar-${(i % 8) + 1} ${isPlaying ? 'animating' : ''}`}
                    style={{
                      '--base-height': '8px',
                      position: 'absolute',
                      width: '3px',
                      height: '8px',
                      background: 'var(--text-accent)',
                      borderRadius: '9999px',
                      left: 'calc(50% - 1.5px)',
                      top: '5px',
                      transformOrigin: 'center 35px',
                      transform: `rotate(${angle}deg)`
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Timeline Track */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <input 
              type="range"
              min={0}
              max={audioDuration || 100}
              value={audioCurrentTime}
              onChange={handleAudioSeek}
              className="audio-timeline-slider"
              style={{ width: '100%', margin: 0 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              <span>{formatDuration(audioCurrentTime)}</span>
              <span>{formatDuration(audioDuration || 0)}</span>
            </div>
          </div>

          {/* Download Button */}
          <button 
            onClick={handleDownloadAudio}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <Download size={13} /> Download Audio Track
          </button>
        </div>
      )}
    </div>
  );
}

export default AudioTrackCard;
