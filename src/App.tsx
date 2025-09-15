import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App: React.FC = () => {
  const [wallet, setWallet] = useState<string>('');
  const [tracking, setTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<GeolocationCoordinates | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string>('Waiting for GPS...');
  const [movementCount, setMovementCount] = useState(0);

  const startTime = useRef<Date | null>(null);
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const watchId = useRef<number | null>(null);

  // Refs for stable geolocation updates
  const lastPosRef = useRef<GeolocationCoordinates | null>(null);
  const distanceRef = useRef<number>(0); // meters

  // Mobile-optimized thresholds
  const MIN_METERS = 3; // 3 meters (~10 feet) - low enough to detect walking
  const MAX_ACCURACY = 65; // Accept up to 65m accuracy (typical for mobile)
  const MAX_SPEED_MPH = 15; // Max running speed

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

  // Timer
  useEffect(() => {
    if (tracking && startTime.current) {
      intervalId.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.current!.getTime()) / 1000));
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

    // Reset everything
    setTracking(true);
    setElapsedTime(0);
    setUpdateCount(0);
    setMovementCount(0);
    setDistanceMiles(0);
    setDebugInfo('Starting GPS...');
    distanceRef.current = 0;
    lastPosRef.current = null;
    startTime.current = new Date();

    if (!('geolocation' in navigator)) {
      setDebugInfo('GPS not supported!');
      alert('Geolocation not supported');
      return;
    }

    // Get initial position first
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastPosRef.current = pos.coords;
        setCurrentPosition(pos.coords);
        setDebugInfo(`GPS locked! Accuracy: ${pos.coords.accuracy.toFixed(0)}m`);
      },
      (err) => {
        setDebugInfo(`Initial GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Then start watching
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;
        setUpdateCount(prev => prev + 1);
        setCurrentPosition(coords);

        // Show accuracy in debug
        let debug = `Accuracy: ${coords.accuracy.toFixed(0)}m`;

        // Check if accuracy is acceptable
        if (coords.accuracy > MAX_ACCURACY) {
          debug += ` (Poor - need <${MAX_ACCURACY}m)`;
          setDebugInfo(debug);
          return;
        }

        // Calculate distance if we have a previous position
        if (lastPosRef.current) {
          const meters = haversineMeters(
            lastPosRef.current.latitude,
            lastPosRef.current.longitude,
            coords.latitude,
            coords.longitude
          );

          // Calculate speed check
          const timeDiff = 5; // Assume 5 seconds between updates
          const speedMph = (meters / timeDiff) * 2.237;

          debug += ` | Move: ${meters.toFixed(1)}m`;

          // Check if movement is valid
          if (speedMph > MAX_SPEED_MPH) {
            debug += ` (Too fast: ${speedMph.toFixed(1)}mph)`;
          } else if (meters >= MIN_METERS) {
            // Valid movement!
            distanceRef.current += meters;
            setMovementCount(prev => prev + 1);
            setDistanceMiles(distanceRef.current / 1609.344);
            debug += ` ✓ Added!`;
            lastPosRef.current = coords;
          } else {
            debug += ` (Need >${MIN_METERS}m)`;
          }
        } else {
          // First position
          lastPosRef.current = coords;
          debug += ' | First position set';
        }

        setDebugInfo(debug);
      },
      (err) => {
        setDebugInfo(`GPS Error: ${err.message}`);
        console.error('GPS error:', err);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);

    const finalMiles = distanceRef.current / 1609.344;
    const tokens = finalMiles >= 1 ? Math.floor(finalMiles) : finalMiles >= 0.5 ? 0.5 : 0;
    
    alert(
      `Run Complete!\n\n` +
      `Distance: ${finalMiles.toFixed(3)} miles\n` +
      `Time: ${formatTime(elapsedTime)}\n` +
      `Valid Movements: ${movementCount}\n` +
      `GPS Updates: ${updateCount}\n` +
      `Tokens Earned: ${tokens} FYTS`
    );
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculatePace = () => {
    if (distanceMiles > 0 && elapsedTime > 0) {
      const pace = elapsedTime / 60 / distanceMiles;
      if (pace > 99) return '--:--';
      const paceMinutes = Math.floor(pace);
      const paceSeconds = Math.floor((pace - paceMinutes) * 60);
      return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;
    }
    return '--:--';
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>FYTS Run Tracker</h1>

      {/* Wallet Section */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        backgroundColor: '#f5f5f5',
        borderRadius: '10px' 
      }}>
        {!wallet ? (
          <button 
            onClick={connectWallet} 
            style={{ 
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Enter Wallet Address
          </button>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#28a745' }}>✓ </span>
            {wallet.substring(0, 6)}...{wallet.substring(38)}
          </div>
        )}
      </div>

      {/* GPS Tracking Section */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: tracking ? '#e8ffe8' : '#f5f5f5',
        borderRadius: '10px',
        border: tracking ? '2px solid #4CAF50' : '2px solid #ddd'
      }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>
          {tracking ? '🔴 Recording' : '🏃 Ready to Run'}
        </h2>

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
              cursor: wallet ? 'pointer' : 'not-allowed',
              width: '100%'
            }}
          >
            START RUN
          </button>
        ) : (
          <div>
            {/* Main Stats */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '15px', 
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', textAlign: 'center' }}>
                {distanceMiles.toFixed(3)} mi
              </div>
              <div style={{ textAlign: 'center', color: '#666', marginTop: '5px' }}>
                {formatTime(elapsedTime)} | Pace: {calculatePace()} /mi
              </div>
            </div>

            {/* Debug Info Box */}
            <div style={{ 
              backgroundColor: '#f0f8ff', 
              padding: '10px', 
              borderRadius: '5px',
              marginBottom: '15px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              <div>📊 Updates: {updateCount} | Movements: {movementCount}</div>
              <div style={{ marginTop: '5px' }}>🎯 {debugInfo}</div>
              {currentPosition && (
                <div style={{ marginTop: '5px', color: '#666' }}>
                  📍 {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
                </div>
              )}
            </div>

            {/* Stop Button */}
            <button
              onClick={stopTracking}
              style={{
                padding: '15px 30px',
                fontSize: '18px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              STOP RUN
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px',
        backgroundColor: '#fff3cd',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <strong>Tips for best GPS:</strong>
        <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
          <li>Use outdoors with clear sky view</li>
          <li>Walk at least 10 feet between stops</li>
          <li>Keep phone screen on</li>
          <li>Allow location access when prompted</li>
        </ul>
      </div>
    </div>
  );
};

export default App;