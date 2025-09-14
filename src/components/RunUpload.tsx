import React, { useState } from 'react';

const RunUpload: React.FC = () => {
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting:', { gpxFile, screenshot });
    alert('Run submitted for approval!');
  };

  return (
    <div style={{padding: '20px', border: '1px solid #ccc', marginTop: '20px'}}>
      <h2>Upload Run</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>GPX File: </label>
          <input 
            type="file" 
            accept=".gpx"
            onChange={(e) => setGpxFile(e.target.files?.[0] || null)}
            required
          />
        </div>
        <div style={{marginTop: '10px'}}>
          <label>Screenshot: </label>
          <input 
            type="file" 
            accept="image/*"
            onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
            required
          />
        </div>
        <button type="submit" style={{marginTop: '15px'}}>Submit Run</button>
      </form>
    </div>
  );
};

export default RunUpload;