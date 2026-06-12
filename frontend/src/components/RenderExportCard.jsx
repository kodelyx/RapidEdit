import React, { useEffect, useRef, useState } from 'react';
import { Zap, Sparkles, FolderOpen, Play, Pause, ChevronRight, X, Clock, HardDrive, FileVideo } from 'lucide-react';

function RenderExportCard({
  intervals,
  videoInfo,
  renderLogs,
  isRenderingVideo,
  handleRenderVideo,
  outputVideoUrl,
  outputVideoPath,
  formatDuration
}) {
  const consoleEndRef = useRef(null);
  const [videoAspect, setVideoAspect] = useState('landscape');

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [renderLogs]);

  const getTotalKeepDuration = () => {
    if (!intervals) return 0;
    return intervals.reduce((sum, [s, e]) => sum + (e - s), 0);
  };

  const getTimeSaved = () => {
    if (!videoInfo || !intervals) return 0;
    return videoInfo.duration_sec - getTotalKeepDuration();
  };

  const renderTimeline = () => {
    if (!videoInfo || !intervals || intervals.length === 0) return null;
    const total = videoInfo.duration_sec;
    const segments = [];
    let lastEnd = 0;

    intervals.forEach(([start, end], idx) => {
      if (start > lastEnd) {
        segments.push({
          type: 'cut',
          width: ((start - lastEnd) / total) * 100,
          label: `Silence: ${lastEnd.toFixed(1)}s → ${start.toFixed(1)}s`,
        });
      }
      segments.push({
        type: 'keep',
        width: ((end - start) / total) * 100,
        label: `Speech: ${start.toFixed(1)}s → ${end.toFixed(1)}s`,
      });
      lastEnd = end;
    });

    if (total > lastEnd) {
      segments.push({
        type: 'cut',
        width: ((total - lastEnd) / total) * 100,
        label: `Silence: ${lastEnd.toFixed(1)}s → ${total.toFixed(1)}s`,
      });
    }

    return (
      <div className="timeline-container">
        <div className="timeline-label">
          <span>Editing Timeline</span>
          <div className="timeline-legend">
            <span><span className="legend-dot keep" /> Speech</span>
            <span><span className="legend-dot cut" /> Silence</span>
          </div>
        </div>
        <div className="timeline-visual">
          {segments.map((seg, i) => (
            <div
              key={i}
              className={`timeline-segment ${seg.type}`}
              style={{ width: `${Math.max(seg.width, 0.5)}%` }}
              title={seg.label}
            />
          ))}
        </div>
        <div className="stats-row">
          <div className="stat-chip">
            🎯 Segments: <span className="stat-value">{intervals.length}</span>
          </div>
          <div className="stat-chip">
            ⏱ Keep: <span className="stat-value">{formatDuration(getTotalKeepDuration())}</span>
          </div>
          <div className="stat-chip">
            ✂️ Cut: <span className="stat-value">{formatDuration(getTimeSaved())}</span>
          </div>
          <div className="stat-chip">
            📉 Reduced: <span className="stat-value">{videoInfo.duration_sec > 0 ? Math.round((getTimeSaved() / videoInfo.duration_sec) * 100) : 0}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`render-card-layout ${outputVideoUrl ? 'with-output' : ''}`}>
      <div className="card render-main-card" style={{ margin: 0 }}>
        <div className="step-header">
          <div className={`step-number ${outputVideoUrl ? 'done' : ''}`}>
            {outputVideoUrl ? '✓' : '3'}
          </div>
          <div className="step-info">
            <div className="step-title">Render & Export</div>
            <div className="step-desc">GPU-accelerated FFmpeg pipeline — cut silence, keep speech</div>
          </div>
        </div>

        {renderTimeline()}

        <div className="split-grid">
          <div>
            <label className="form-label" style={{ marginBottom: '0.5rem' }}>Keep-Interval Table</label>
            <div className="intervals-table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {intervals.map(([start, end], idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{start.toFixed(2)}s</td>
                      <td>{end.toFixed(2)}s</td>
                      <td>{(end - start).toFixed(2)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ marginBottom: '0.5rem' }}>Console Output</label>
            <div className="console-wrapper">
              <div className="console-header">
                <div className="console-dots">
                  <span className="console-dot" />
                  <span className="console-dot" />
                  <span className="console-dot" />
                </div>
                <span className="console-title">rapid_edit.py</span>
              </div>
              <div className="console-box">
                {renderLogs.length === 0 && !isRenderingVideo && (
                  <div style={{ color: 'var(--text-muted)' }}>
                    Waiting for render command...
                  </div>
                )}
                {renderLogs.map((log, idx) => (
                  <div key={idx} className="console-line">{log}</div>
                ))}
                {isRenderingVideo && (
                  <div className="loader-pulse">
                    <span className="spinner" />
                    FFmpeg pipeline active...
                  </div>
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>
          </div>
        </div>

        <button
          id="render-video-btn"
          className="btn btn-success"
          onClick={handleRenderVideo}
          disabled={isRenderingVideo}
          style={{ marginTop: '1.25rem', width: '100%' }}
        >
          {isRenderingVideo ? (
            <>
              <span className="spinner" />
              Running FFmpeg GPU Pipeline...
            </>
          ) : (
            <><Zap size={14} /> Cut & Render Output Video</>
          )}
        </button>
      </div>

      {outputVideoUrl && (
        <div className="card card-compact" style={{ margin: 0 }}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="icon"><Sparkles size={16} /></span>
              Output
            </div>
          </div>

          <div className={`sidebar-preview-wrapper preview-${videoAspect}`}>
            <video 
              src={outputVideoUrl} 
              className="sidebar-video-preview"
              controls 
              onLoadedMetadata={(e) => {
                const { videoWidth, videoHeight } = e.target;
                if (videoWidth && videoHeight) {
                  const ratio = videoWidth / videoHeight;
                  if (ratio < 0.8) {
                    setVideoAspect('portrait');
                  } else if (ratio > 1.25) {
                    setVideoAspect('landscape');
                  } else {
                    setVideoAspect('square');
                  }
                }
              }}
            />
          </div>

          <div className="metadata-grid" style={{ marginTop: '0.6rem' }}>
            <div className="metadata-item">
              <div className="metadata-label">File</div>
              <div className="metadata-value" style={{ fontSize: '0.72rem' }}>{outputVideoPath.split('/').pop()}</div>
            </div>
            <div className="metadata-item">
              <div className="metadata-label">Duration</div>
              <div className="metadata-value">{formatDuration(getTotalKeepDuration())}</div>
            </div>
          </div>

          <button 
            onClick={() => {
              fetch(outputVideoUrl)
                .then(res => res.blob())
                .then(blob => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = outputVideoPath.split('/').pop();
                  a.click();
                  URL.revokeObjectURL(url);
                });
            }}
            className="btn btn-primary btn-sm"
            style={{ marginTop: '0.8rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <HardDrive size={13} /> Download Output
          </button>
        </div>
      )}
    </div>
  );
}

export default RenderExportCard;
