import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import AdminDashboard from './components/AdminDashboard';
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
  const [isAdmin, setIsAdmin] = useState(false);

  const startTime = useRef<Date | null>(null);
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const watchId = useRef<number | null>(null);
  const lastPosRef = useRef<GeolocationCoordinates | null>(null);
  const distanceRef = useRef<number>(0);

  const MIN_METERS = 3;
  const MAX_ACCURACY = 65;
  const MAX_SPEED_MPH = 15;

  const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

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

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;
        setUpdateCount(prev => prev + 1);
        setCurrentPosition(coords);

        let debug = `Accuracy: ${coords.accuracy.toFixed(0)}m`;

        if (coords.accuracy > MAX_ACCURACY) {
          debug += ` (Poor - need <${MAX_ACCURACY}m)`;
          setDebugInfo(debug);
          return;
        }

        if (lastPosRef.current) {
          const meters = haversineMeters(
            lastPosRef.current.latitude,
            lastPosRef.current.longitude,
            coords.latitude,
            coords.longitude
          );

          const timeDiff = 5;
          const speedMph = (meters / timeDiff) * 2.237;

          debug += ` | Move: ${meters.toFixed(1)}m`;

          if (speedMph > MAX_SPEED_MPH) {
            debug += ` (Too fast: ${speedMph.toFixed(1)}mph)`;
          } else if (meters >= MIN_METERS) {
            distanceRef.current += meters;
            setMovementCount(prev => prev + 1);
            setDistanceMiles(distanceRef.current / 1609.344);
            debug += ` ✓ Added!`;
            lastPosRef.current = coords;
          } else {
            debug += ` (Need >${MIN_METERS}m)`;
          }
        } else {
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

  const stopTracking = async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);

    const finalMiles = distanceRef.current / 1609.344;
    const tokens = finalMiles >= 1 ? Math.floor(finalMiles) : finalMiles >= 0.5 ? 0.5 : 0;
    
    try {
      await addDoc(collection(db, 'runs'), {
        wallet: wallet,
        distance: finalMiles,
        time: formatTime(elapsedTime),
        duration: elapsedTime,
        date: new Date().toISOString(),
        tokens: tokens,
        status: 'pending',
        gpsUpdates: updateCount,
        movements: movementCount,
        createdAt: new Date()
      });
      
      alert(
        `Run Submitted!\n\n` +
        `Distance: ${finalMiles.toFixed(3)} miles\n` +
        `Time: ${formatTime(elapsedTime)}\n` +
        `Tokens Pending: ${tokens} FYTS\n\n` +
        `Your run has been saved for admin review.`
      );
    } catch (error) {
      console.error('Error saving run:', error);
      alert('Error saving run. Please try again.');
    }
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

  const checkAdminAccess = () => {
    const password = prompt('Enter admin password:');
    if (password === 'Fyts123!') {
      setIsAdmin(true);
    } else {
      alert('Invalid password');
    }
  };

  // Show admin dashboard if admin mode is active
  if (isAdmin) {
    return (
      <div>
        <button 
          onClick={() => setIsAdmin(false)}
          style={{ 
            position: 'fixed', 
            top: '10px', 
            right: '10px', 
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            zIndex: 1000
          }}
        >
          Exit Admin
        </button>
        <AdminDashboard />
      </div>
    );
  }

  // Regular user interface
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>FYTS Run Tracker</h1>

      <button
        onClick={checkAdminAccess}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          padding: '5px 10px',
          fontSize: '12px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          opacity: 0.5
        }}
      >
        Admin
      </button>

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
    </div>
  );
};

export default App;