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
  const [movementCount, setMovementCount] = useState(0);
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

  const connectWallet = async () => {
    // Try MetaMask first
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setWallet(accounts[0]);
      } catch {
        // If MetaMask fails, fallback to manual entry
        const address = prompt('Enter your wallet address (0x...):');
        if (address && address.startsWith('0x') && address.length === 42) {
          setWallet(address);
        } else if (address) {
          alert('Invalid wallet address. Must start with 0x and be 42 characters.');
        }
      }
    } else {
      // No wallet detected - manual entry
      const address = prompt('No wallet detected. Enter your wallet address:');
      if (address && address.startsWith('0x') && address.length === 42) {
        setWallet(address);
      } else if (address) {
        alert('Invalid wallet address. Must start with 0x and be 42 characters.');
      }
    }
  };

  const startTracking = () => {
    if (!wallet) {
      alert('Please connect wallet first');
      return;
    }

    if (!navigator.geolocation) {
      alert('GPS not supported on this device');
      return;
    }

    setTracking(true);
    setDistance(0);
    setStartTime(new Date());
    setUpdateCount(0);
    setMovementCount(0);
    setLastPosition(null);

    // Minimum distance in miles to count as movement (5 meters = ~0.003 miles)
    const MIN_DISTANCE = 0.003;

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
          
          // Only update distance if moved more than 5 meters
          if (dist >= MIN_DISTANCE) {
            setDistance(prev => prev + dist);
            setLastPosition(coords);
            setMovementCount(prev => prev + 1);
            console.log(`Movement #${movementCount + 1}: ${(dist * 1609).toFixed(1)} meters`);
          }
        } else {
          // First position
          setLastPosition(coords);
        }
      },
      (error) => {
        console.error('GPS Error:', error);
        let errorMessage = 'Unknown GPS error';
        switch(error.code) {
          case 1:
            errorMessage = 'GPS permission denied. Please enable location services.';
            break;
          case 2:
            errorMessage = 'GPS position unavailable. Try going outside.';
            break;
          case 3:
            errorMessage = 'GPS timeout. Trying again...';
            return; // Don't stop tracking on timeout
        }
        alert(errorMessage);
        setTracking(false);
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
    
    // Save run data
    const runData = {
      wallet,
      distance: distance.toFixed(3),
      time: formatTime(elapsedTime),
      pace: calculatePace(),
      tokens,
      date: new Date().toISOString(),
      gpsUpdates: updateCount,
      movements: movementCount
    };
    
    console.log('Run completed:', runData);
    
    alert(
      `Run Complete!\n\n` +
      `Distance: ${distance.toFixed(3)} miles\n` +
      `Time: ${formatTime(elapsedTime)}\n` +
      `Pace: ${calculatePace()}\n` +
      `Tokens earned: ${tokens} FYTS\n\n` +
      `GPS Updates: ${updateCount}\n` +
      `Valid Movements: ${movementCount}`
    );
    
    // Reset for next run
    setElapsedTime(0);
    setStartTime(null);
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
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>FYTS Run Tracker</h1>
      
      {/* Wallet Section */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#555' }}>Wallet Connection</h3>
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
              cursor: 'pointer'
            }}
          >
            Connect / Enter Wallet
          </button>
        ) : (
          <div>
            <p style={{ color: '#28a745', fontWeight: 'bold' }}>
              ✓ Connected
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '14px' }}>
              {wallet.substring(0, 6)}...{wallet.substring(38)}
            </p>
          </div>
        )}
      </div>

      {/* GPS Tracking Section */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: tracking ? '#e8f5e9' : '#f8f9fa',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#555' }}>
          {tracking ? '🔴 Recording Run' : '🏃 GPS Tracking'}
        </h3>
        
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
            Start Run
          </button>
        ) : (
          <div>
            {/* Stats Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '15px', 
              marginBottom: '20px' 
            }}>
              <div style={{ 
                padding: '15px', 
                backgroundColor: 'white', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                  DISTANCE
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2196F3' }}>
                  {distance.toFixed(3)}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>miles</div>
              </div>
              
              <div style={{ 
                padding: '15px', 
                backgroundColor: 'white', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                  TIME