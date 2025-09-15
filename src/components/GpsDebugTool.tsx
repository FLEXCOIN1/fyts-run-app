import { useState } from 'react';

export default function GpsDebugTool() {
  const [results, setResults] = useState<string[]>([]);

  const debugGPS = async () => {
    const log = (msg: string) => {
      setResults(prev => [...prev, msg]);
      console.log(msg);
    };

    // Clear previous results
    setResults([]);

    try {
      // Step 1: Check if geolocation exists
      if (!("geolocation" in navigator)) {
        log("❌ Geolocation not supported");
        return;
      }
      log("✅ navigator.geolocation available");

      // Step 2: Check permissions
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: "geolocation" });
        log(`🔎 Permission state: ${result.state}`);
      } else {
        log("⚠️ Permissions API not supported");
      }

      // Step 3: Try to get location
      log("📡 Requesting location...");
      
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          log(`📍 SUCCESS!`);
          log(`Lat: ${pos.coords.latitude}`);
          log(`Lng: ${pos.coords.longitude}`);
          log(`Accuracy: ${pos.coords.accuracy}m`);
        },
        (err) => {
          log(`❌ ERROR: ${err.message}`);
          log(`Error Code: ${err.code}`);
          // Error codes: 1=DENIED, 2=UNAVAILABLE, 3=TIMEOUT
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (e: any) {
      log(`💥 Exception: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>GPS Debug Tool</h2>
      <button 
        onClick={debugGPS}
        style={{ padding: '10px 20px', fontSize: '16px' }}
      >
        Test GPS
      </button>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#f0f0f0',
        borderRadius: '5px',
        minHeight: '100px'
      }}>
        {results.length === 0 ? (
          <p>Click button to start debugging...</p>
        ) : (
          results.map((result, i) => (
            <div key={i}>{result}</div>
          ))
        )}
      </div>
    </div>
  );
}