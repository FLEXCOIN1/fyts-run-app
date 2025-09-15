import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App: React.FC = () => {
  const [wallet, setWallet] = useState<string>('');
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastPosition, setLastPosition] = useState<GeolocationCoordinates | null>(null);
  const [currentPosition, setCurrentPosition] = useState<GeolocationCoordinates | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const watchId = useRef<number | null>(null);
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

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

    setTracking(true);
    setDistance(0);
    setStartTime(new Date());
    setUpdateCount(0);
    setLastPosition(null);

    const MIN_DISTANCE = 0.003; // 5 meters in miles

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        setCurrentPosition(coords);
        setUpdateCount(prev => prev + 1);

        if (lastPosition) {
          const dist = calculateDistance(
            lastPosition.latitude,
            lastPosition.longitude,
            coords.latitude,
            coords.longitude
          );
          
          if (dist >= MIN_DISTANCE) {
            setDistance(prev => prev + dist);
            setLastPosition(coords);
          }
        } else {
          setLastPosition(coords);
        }
      },
      (error) => {
        alert(`GPS Error: ${error.message}`);
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
    const tokens = distance >= 1 ? Math.floor(distance) : distance >= 0.5 ? 0.5 : 0;
    alert(`Run complete!\nDistance: ${distance.toFixed(3)} miles\nTime: ${formatTime(elapsedTime)}\nTokens: ${tokens} FYTS`);
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
          <button onClick={connectWallet}>Enter Wallet Address</button>
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
              padding: '10px 20px',
              backgroundColor: wallet ? '#4CAF50' : '#ccc',
              color: 'white'
            }}
          >
            Start Run
          </button>
        ) : (
          <div>
            <p>Distance: {distance.toFixed(3)} miles</p>
            <p>Time: {formatTime(elapsedTime)}</p>
            <p>Pace: {calculatePace()}</p>
            <p>GPS Updates: {updateCount}</p>
            {currentPosition && (
              <p style={{ fontSize: '12px' }}>
                Location: {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
              </p>
            )}
            <button 
              onClick={stopTracking}
              style={{ 
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: 'white',
                marginTop: '10px'
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