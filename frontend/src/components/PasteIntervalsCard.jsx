import React, { useState } from 'react';
import { Clipboard, Upload, Check, AlertCircle } from 'lucide-react';

function PasteIntervalsCard({
  rawAiResponse,
  handleRawInputChange,
  readIntervalsFile,
  handleIntervalsFileChange,
  intervals
}) {
  const [isDraggingIntervals, setIsDraggingIntervals] = useState(false);

  return (
    <div className="card card-compact">
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="icon"><Clipboard size={16} /></span>
          Paste Intervals / AI Response
        </div>
        <button 
          className="sidebar-card-action-btn"
          onClick={() => document.getElementById('intervals-file-input').click()}
          title="Upload Text/JSON File"
        >
          <Upload size={13} />
        </button>
        <input
          id="intervals-file-input"
          type="file"
          accept=".txt,.json"
          style={{ display: 'none' }}
          onChange={handleIntervalsFileChange}
        />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '0.75rem' }}>
          <textarea
            id="intervals-input"
            className={isDraggingIntervals ? 'dragging' : ''}
            placeholder="e.g. [[0.5, 2.3], [3.1, 5.8]] or drag & drop text/JSON file here..."
            value={rawAiResponse}
            onChange={handleRawInputChange}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingIntervals(true); }}
            onDragLeave={() => setIsDraggingIntervals(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingIntervals(false);
              const file = e.dataTransfer.files[0];
              if (file) {
                readIntervalsFile(file);
              }
            }}
            style={{ flex: 1, minHeight: '120px', resize: 'none' }}
          />
        </div>

        {intervals ? (
          <div className="alert alert-success" style={{ marginTop: 'auto', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
            <Check size={13} style={{ marginRight: '0.3rem' }} /> Parsed {intervals.length} speech segments
          </div>
        ) : (
          <button 
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text) {
                  handleRawInputChange({ target: { value: text } });
                }
              } catch (err) {
                alert("Failed to read clipboard: " + err.message);
              }
            }}
            style={{ marginTop: 'auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <Clipboard size={13} /> Paste AI Response
          </button>
        )}
      </div>
    </div>
  );
}

export default PasteIntervalsCard;
