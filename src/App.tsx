import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Calculate distance in meters
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Earth radius in meters
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
  const [distance, setDistance] = useState(0); // miles for display
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [updateCount, setUpdateCount] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<GeolocationCoordinates | null>(null);

  // Use refs to avoid stale closure issues
  const lastPosRef = useRef<GeolocationCoordinates | null>(null);
  const distanceRef = useRef<number>(0); // meters
  const watchId = useRef<number | null>(null);
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const lastUiUpdateRef = useRef<number>(0);

  const MIN_METERS = 5; // minimum movement to count
  const MAX_ALLOWED_ACCURACY = 50; // ignore positions with >50m accuracy

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

    // Reset everything
    distanceRef.current = 0;
    setDistance(0);
    lastPosRef.current = null;
    setTracking(true);
    setStartTime(new Date());
    setUpdateCount(0);
    setElapsedTime(0);
    lastUiUpdateRef.current = 0;

    if (!('geolocation' in navigator)) {
      alert('Geolocation not supported');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        
        // Check accuracy - ignore poor GPS fixes
        if (typeof coords.accuracy === 'number' && coords.accuracy > MAX_ALLOWED_ACCURACY) {
          console.log('Ignoring low-accuracy fix:', coords.accuracy);
          return;
        }

        // Calculate distance from last position
        const prev = lastPosRef.current;
        if (prev) {
          const meters = haversineMeters(
            prev.latitude, 
            prev.longitude, 
            coords.latitude, 
            coords.longitude
          );
          
          if (meters >= MIN_METERS) {
            distanceRef.current += meters;
            console.log(`Movement: ${meters.toFixed(1)}m, Total: ${distanceRef.current.toFixed(1)}m`);
          }
        }

        // Always update last position ref
        lastPosRef.current = coords;
        setCurrentPosition(coords);
        setUpdateCount(u => u + 1);

        // Throttle UI updates to once per second
        const now = Date.now();
        if (now - lastUiUpdateRef.current > 1000) {
          lastUiUpdateRef.current = now;
          setDistance(distanceRef.current / 1609.344); // convert to miles
        }
      },
      (err) => {
        console.error('GPS error', err);
        alert(`GPS Error: ${err.message}`);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
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
    
    // Final UI update
    const finalMiles = distanceRef.current / 1609.344;
    setDistance(finalMiles);
    
    const tokens = finalMiles >= 1 ? Math.floor(finalMiles) : finalMiles >= 0.5 ? 0.5 : 0;
    
    alert(
      `Run complete!\n` +
      `Distance: ${finalMiles.toFixed(3)} miles\n` +
      `Time: ${formatTime(elapsedTime)}\n` +
      `Tokens: ${tokens} FYTS\n` +
      `GPS Updates: ${updateCount}`
    );
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
            {currentPosition && (
              <div style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
                Accuracy: ±{currentPosition.accuracy.toFixed(0)}m
              </div>
            )}
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