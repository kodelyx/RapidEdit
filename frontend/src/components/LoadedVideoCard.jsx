import React, { useState } from 'react';
import { Video, RefreshCw, Trash2 } from 'lucide-react';

function LoadedVideoCard({
  videoInfo,
  videoPreviewUrl,
  handleRemoveVideo,
  handleFileSelection,
  formatDuration
}) {
  const [videoAspect, setVideoAspect] = useState('landscape');

  return (
    <div className="card card-compact">
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="icon"><Video size={16} /></span>
          Loaded Video
        </div>
        <button 
          className="sidebar-card-action-btn"
          onClick={() => document.getElementById('file-select-input-2').click()}
          title="Change Video"
        >
          <RefreshCw size={13} />
        </button>
      </div>
      
      <input
        id="file-select-input-2"
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            handleFileSelection(file);
          }
        }}
      />

      <div className={`sidebar-preview-wrapper preview-${videoAspect}`}>
        <video 
          src={videoPreviewUrl} 
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
          <div className="metadata-label">Size</div>
          <div className="metadata-value">{videoInfo.size_mb} MB</div>
        </div>
        <div className="metadata-item">
          <div className="metadata-label">Duration</div>
          <div className="metadata-value">{formatDuration(videoInfo.duration_sec)}</div>
        </div>
      </div>

      <button
        className="btn btn-secondary btn-sm"
        onClick={handleRemoveVideo}
        style={{ marginTop: '0.8rem', width: '100%', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}
      >
        <Trash2 size={13} /> Remove Video
      </button>
    </div>
  );
}

export default LoadedVideoCard;
