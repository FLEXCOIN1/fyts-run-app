import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App: React.FC = () => {
  const [wallet, setWallet] = useState<string>('');
  const [tracking, setTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<GeolocationCoordinates | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [distanceMiles, setDistanceMiles] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const watchId = useRef<number | null>(null);

  // Refs for stable geolocation updates
  const lastPosRef = useRef<GeolocationCoordinates | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const distanceRef = useRef<number>(0); // meters
  const lastUiUpdateRef = useRef<number>(0);
  const speedBufferRef = useRef<number[]>([]); // Rolling average for pace
  const lastValidPaceRef = useRef<string>('--:-- /mi');

  // Stricter thresholds
  const MIN_METERS = 10; // Raised from 5 to reduce jitter
  const MAX_ACCURACY = 20; // Tightened from 50 for better precision
  const MAX_SPEED_M_S = 6.7; // ~15 mph
  const MIN_PACE_MIN_PER_MI = 3; // Fastest reasonable pace
  const MAX_PACE_MIN_PER_MI = 30; // Slowest reasonable pace

  const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // meters
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Add speed to rolling buffer
  const addSpeed = (speed: number) => {
    speedBufferRef.current.push(speed);
    if (speedBufferRef.current.length > 10) {
      speedBufferRef.current.shift();
    }
  };

  // Get average speed from buffer
  const getAvgSpeed = () => {
    if (speedBufferRef.current.length === 0) return 0;
    return speedBufferRef.current.reduce((a, b) => a + b, 0) / speedBufferRef.current.length;
  };

  // Elapsed time ticker using timestamp refs
  useEffect(() => {
    if (tracking && startTimeRef.current) {
      intervalId.current = setInterval(() => {
        const currentTime = lastTimestampRef.current || Date.now();
        setElapsedTime(Math.floor((currentTime - startTimeRef.current!) / 1000));
      }, 1000);
    } else {
      if (intervalId.current) clearInterval(intervalId.current);
    }
    return () => {
      if (intervalId.current) clearInterval(intervalId.current);
    };
  }, [tracking]);

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

    // Reset all values
    setTracking(true);
    setElapsedTime(0);
    setUpdateCount(0);
    setDistanceMiles(0);
    distanceRef.current = 0;
    lastPosRef.current = null;
    lastTimestampRef.current = null;
    startTimeRef.current = null;
    speedBufferRef.current = [];
    lastValidPaceRef.current = '--:-- /mi';

    if (!('geolocation' in navigator)) {
      alert('Geolocation not supported');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;
        const ts = pos.timestamp; // Always use pos.timestamp

        // Set start time from first GPS fix
        if (!startTimeRef.current) {
          startTimeRef.current = ts;
        }

        // Enhanced debug logging
        console.debug('GPS Update:', {
          accuracy: coords.accuracy,
          lat: coords.latitude,
          lon: coords.longitude,
          ts: ts,
          elapsed: (ts - startTimeRef.current) / 1000
        });

        // Stricter accuracy check
        if (coords.accuracy > MAX_ACCURACY) {
          console.debug(`Ignored: accuracy ${coords.accuracy}m > ${MAX_ACCURACY}m`);
          return;
        }

        // Timestamp check
        if (lastTimestampRef.current && ts <= lastTimestampRef.current) {
          console.debug('Ignored: out-of-order timestamp');
          return;
        }

        if (lastPosRef.current && lastTimestampRef.current) {
          const meters = haversineMeters(
            lastPosRef.current.latitude,
            lastPosRef.current.longitude,
            coords.latitude,
            coords.longitude
          );

          const dt = (ts - lastTimestampRef.current) / 1000;
          const speed = dt > 0 ? meters / dt : 0;

          console.debug('Movement calc:', {
            meters: meters.toFixed(1),
            dt: dt.toFixed(1),
            speed: (speed * 2.237).toFixed(1) + ' mph',
            willCount: meters >= MIN_METERS && speed <= MAX_SPEED_M_S
          });

          if (speed > MAX_SPEED_M_S) {
            console.debug(`Ignored: speed ${(speed * 2.237).toFixed(1)} mph > 15 mph`);
          } else if (meters >= MIN_METERS) {
            distanceRef.current += meters;
            addSpeed(speed); // Add to rolling average
            console.debug(`✓ Added ${meters.toFixed(1)}m, Total: ${distanceRef.current.toFixed(1)}m`);
          } else {
            console.debug(`Ignored: distance ${meters.toFixed(1)}m < ${MIN_METERS}m`);
          }
        }

        lastPosRef.current = coords;
        lastTimestampRef.current = ts;
        setCurrentPosition(coords);
        setUpdateCount((u) => u + 1);

        // Throttle UI update
        const now = Date.now();
        if (now - lastUiUpdateRef.current > 1000) {
          lastUiUpdateRef.current = now;
          setDistanceMiles(distanceRef.current / 1609.344);
        }
      },
      (err) => {
        console.error('GPS Error:', err);
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

    const finalMiles = distanceRef.current / 1609.344;
    setDistanceMiles(finalMiles);

    const tokens =
      finalMiles >= 1 ? Math.floor(finalMiles) : finalMiles >= 0.5 ? 0.5 : 0;
    alert(
      `Run complete!\n` +
      `Distance: ${finalMiles.toFixed(3)} miles\n` +
      `Time: ${formatTime(elapsedTime)}\n` +
      `Pace: ${calculatePace()}\n` +
      `Tokens: ${tokens} FYTS`
    );
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculatePace = () => {
    // Use average speed from buffer for smoother pace
    const avgSpeed = getAvgSpeed(); // m/s
    
    if (avgSpeed > 0) {
      const milesPerSecond = avgSpeed / 1609.344;
      const minutesPerMile = 1 / (milesPerSecond * 60);
      
      // Sanity check on pace
      if (minutesPerMile >= MIN_PACE_MIN_PER_MI && minutesPerMile <= MAX_PACE_MIN_PER_MI) {
        const paceMinutes = Math.floor(minutesPerMile);
        const paceSeconds = Math.floor((minutesPerMile - paceMinutes) * 60);
        const paceStr = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /mi`;
        lastValidPaceRef.current = paceStr;
        return paceStr;
      }
    }
    
    // Return last valid pace if current calculation is invalid
    return lastValidPaceRef.current;
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
              fontSize: '16px',
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
            <p style={{ fontSize: '20px', fontWeight: 'bold' }}>
              Distance: {distanceMiles.toFixed(3)} miles
            </p>
            <p>Time: {formatTime(elapsedTime)}</p>
            <p>Pace: {calculatePace()}</p>
            <p>GPS Updates: {updateCount}</p>
            {currentPosition && (
              <>
                <p style={{ fontSize: '12px' }}>
                  Location: {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
                </p>
                <p style={{ fontSize: '12px', color: '#666' }}>
                  Accuracy: ±{currentPosition.accuracy.toFixed(0)}m
                  {currentPosition.accuracy > MAX_ACCURACY && ' (Poor signal)'}
                </p>
              </>
            )}
            <button
              onClick={stopTracking}
              style={{
                padding: '15px 30px',
                fontSize: '16px',
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