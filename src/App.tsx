import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Calculate distance in meters
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const App: React.FC = () => {
  const [wallet, setWallet] = useState<string>('');
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState(0); // miles for UI
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [updateCount, setUpdateCount] = useState(0);

  // Refs to avoid stale closures
  const lastPosRef = useRef<GeolocationCoordinates | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const distanceRef = useRef<number>(0); // meters
  const lastUiUpdateRef = useRef<number>(0);
  const watchId = useRef<number | null>(null);
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  const MIN_METERS = 5; // ignore movement < 5m
  const MAX_ACCURACY = 50; // ignore fixes worse than 50m accuracy
  const MAX_SPEED_M_S = 6.7056; // 15 mph in m/s

  // Timer for elapsed time
  useEffect(() => {
    if (tracking && startTime) {
      intervalId.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    } else {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    }
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    };
  }, [tracking, startTime]);

  const connectWallet = () => {
    const address = prompt('Enter your wallet address (0x...):');
    if (address && address.startsWith('0x')) {
      setWallet(address);
    }
  };

  const startTracking = () => {
    if (!wallet) {
      alert('Please connect wallet first');
      return;
    }

    // Reset
    distanceRef.current = 0;
    setDistance(0);
    lastPosRef.current = null;
    lastTimestampRef.current = null;
    setTracking(true);
    setStartTime(new Date());
    setElapsedTime(0);
    setUpdateCount(0);

    if (!('geolocation' in navigator)) {
      alert('Geolocation not supported');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;
        const ts = pos.timestamp ?? Date.now();

        // 1) Accuracy guard
        if (typeof coords.accuracy === 'number' && coords.accuracy > MAX_ACCURACY) {
          console.debug('Ignored low-accuracy fix', coords.accuracy);
          return;
        }

        // 2) Timestamp/order guard
        if (lastTimestampRef.current && ts <= lastTimestampRef.current) {
          console.debug('Ignored out-of-order timestamp', {last: lastTimestampRef.current, now: ts});
          return;
        }

        // 3) Compute meters delta if we have a previous point
        if (lastPosRef.current && lastTimestampRef.current) {
          const meters = haversineMeters(
            lastPosRef.current.latitude, lastPosRef.current.longitude,
            coords.latitude, coords.longitude
          );

          // 4) Time delta seconds
          const dt = (ts - lastTimestampRef.current) / 1000;
          const speed = dt > 0 ? (meters / dt) : 0;

          // 5) Speed sanity check
          if (speed > MAX_SPEED_M_S) {
            console.debug('Ignored unrealistic speed', speed * 2.237); // show in mph
          } else if (meters >= MIN_METERS) {
            distanceRef.current += meters;
            console.debug(`Added ${meters.toFixed(1)}m, Total: ${distanceRef.current.toFixed(1)}m`);
          }
        }

        // 6) Store current as last
        lastPosRef.current = coords;
        lastTimestampRef.current = ts;

        // 7) Update UI throttled
        setUpdateCount(u => u + 1);
        const now = Date.now();
        if (now - lastUiUpdateRef.current > 1000) {
          lastUiUpdateRef.current = now;
          setDistance(distanceRef.current / 1609.344);
        }
      },
      (err) => {
        console.error('GPS error', err);
        alert(`GPS Error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
    
    // Final UI update
    const finalMeters = distanceRef.current;
    const finalMiles = finalMeters / 1609.344;
    setDistance(finalMiles);
    
    const tokens = finalMiles >= 1 ? Math.floor(finalMiles) : finalMiles >= 0.5 ? 0.5 : 0;
    
    alert(`Run complete!\nDistance: ${finalMiles.toFixed(3)} miles\nTime: ${formatTime(elapsedTime)}\nTokens: ${tokens} FYTS`);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculatePace = () => {
    if (distance > 0 && elapsedTime > 0) {
      const pace = (elapsedTime / 60) / distance;
      const paceMinutes = Math.floor(pace);
      const paceSeconds = Math.floor((pace - paceMinutes) * 60);
      return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /mi`;
    }
    return '--:-- /mi';
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>FYTS Run Tracker</h1>
      
      <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '10px' }}>
        {!wallet ? (
          <button onClick={connectWallet} style={{ padding: '10px 20px' }}>
            Enter Wallet Address
          </button>
        ) : (
          <p>Wallet: {wallet.substring(0, 6)}...{wallet.substring(38)}</p>
        )}
      </div>

      <div style={{ padding: '20px', border: '2px solid #4CAF50', borderRadius: '10px' }}>
        <h2>GPS Tracking</h2>
        
        {!tracking ? (
          <button 
            onClick={startTracking} 
            disabled={!wallet}
            style={{ 
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: wallet ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: wallet ? 'pointer' : 'not-allowed'
            }}
          >
            Start Run
          </button>
        ) : (
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
              {distance.toFixed(3)} miles
            </div>
            <div>Time: {formatTime(elapsedTime)}</div>
            <div>Pace: {calculatePace()}</div>
            <div>GPS Updates: {updateCount}</div>
            <button 
              onClick={stopTracking}
              style={{ 
                padding: '15px 30px',
                fontSize: '18px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                marginTop: '20px',
                cursor: 'pointer'
              }}
            >
              Stop Run
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;