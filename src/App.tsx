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

  // Calculate distance between two coordinates in miles
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Update timer every second
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

    // Get high accuracy GPS updates
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        setCurrentPosition(coords);
        setUpdateCount(prev => prev + 1);

        // Calculate distance if we have a previous position
        if (lastPosition) {
          const dist = calculateDistance(
            lastPosition.latitude,
            lastPosition.longitude,
            coords.latitude,
            coords.longitude
          );
          
          // Only add distance if movement is significant (more than 10 feet)
          if (dist > 0.002) {
            setDistance(prev => prev + dist);
            console.log(`Distance update: +${dist.toFixed(4)} miles`);
          }
        }
        
        setLastPosition(coords);
      },
      (error) => {
        console.error('GPS Error:', error);
        alert(`GPS Error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
        distanceFilter: 5 // Update every 5 meters of movement
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
    
    alert(`Run complete!\nDistance: ${distance.toFixed(3)} miles\nTime: ${formatTime(elapsedTime)}\nTokens earned: ${tokens} FYTS`);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculatePace = () => {
    if (distance > 0 && elapsedTime > 0) {
      const minutes = elapsedTime / 60;
      const pace = minutes / distance;
      const paceMinutes = Math.floor(pace);
      const paceSeconds = Math.floor((pace - paceMinutes) * 60);
      return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /mi`;
    }
    return '--:-- /mi';
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>FYTS Run Tracker</h1>
      
      {/* Wallet Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '10px' }}>
        {!wallet ? (
          <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px' }}>
            Enter Wallet Address
          </button>
        ) : (
          <p>Wallet: {wallet.substring(0, 6)}...{wallet.substring(38)}</p>
        )}
      </div>

      {/* GPS Tracking Section */}
      <div style={{ padding: '20px', border: '2px solid #4CAF50', borderRadius: '10px' }}>
        <h2>GPS Run Tracking</h2>
        
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>DISTANCE</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{distance.toFixed(3)} mi</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>TIME</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatTime(elapsedTime)}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>PACE</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{calculatePace()}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>GPS UPDATES</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{updateCount}</div>
              </div>
            </div>
            
            {currentPosition && (
              <div style={{ fontSize: '10px', color: '#666', marginBottom: '10px' }}>
                GPS: {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)} 
                (±{currentPosition.accuracy.toFixed(0)}m)
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
                cursor: 'pointer',
                width: '100%'
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