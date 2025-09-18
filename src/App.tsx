import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import AdminDashboard from './components/AdminDashboard';
import RunHistory from './components/RunHistory';
import Disclaimer from './components/Disclaimer';
import Instructions from './components/Instructions';
import TermsOfService from './legal/TermsOfService';
import PrivacyPolicy from './legal/PrivacyPolicy';
import './App.css';

const MainApp: React.FC = () => {
  const [wallet, setWallet] = useState<string>('');
  const [tracking, setTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<GeolocationCoordinates | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string>('Waiting for GPS...');
  const [movementCount, setMovementCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const startTime = useRef<Date | null>(null);
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const watchId = useRef<number | null>(null);
  const lastPosRef = useRef<GeolocationCoordinates | null>(null);
  const distanceRef = useRef<number>(0);

  const MIN_METERS = 3;
  const MAX_ACCURACY = 65;
  const MAX_SPEED_MPH = 15;

  useEffect(() => {
    if (wallet) {
      const termsAccepted = localStorage.getItem(`fyts_terms_${wallet}`);
      if (!termsAccepted) {
        setShowDisclaimer(true);
      }
    }
  }, [wallet]);

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
    const address = prompt('Enter your Polygon wallet address (0x...):');
    if (address && address.startsWith('0x') && address.length === 42) {
      setWallet(address);
    } else {
      alert('Please enter a valid Polygon wallet address');
    }
  };

  const startTracking = () => {
    if (!wallet) {
      alert('Please connect your wallet first to participate in the validation network');
      return;
    }

    const termsAccepted = localStorage.getItem(`fyts_terms_${wallet}`);
    if (!termsAccepted) {
      setShowDisclaimer(true);
      return;
    }

    setTracking(true);
    setElapsedTime(0);
    setUpdateCount(0);
    setMovementCount(0);
    setDistanceMiles(0);
    setDebugInfo('Initializing movement validation...');
    distanceRef.current = 0;
    lastPosRef.current = null;
    startTime.current = new Date();
    setShowHistory(false);
    setShowInstructions(false);

    if (!('geolocation' in navigator)) {
      setDebugInfo('GPS not supported on this device');
      alert('GPS required for movement validation');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastPosRef.current = pos.coords;
        setCurrentPosition(pos.coords);
        setDebugInfo(`GPS locked! Accuracy: ${pos.coords.accuracy.toFixed(0)}m`);
      },
      (err) => {
        setDebugInfo(`GPS initialization error: ${err.message}`);
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
          debug += ` (Need <${MAX_ACCURACY}m for validation)`;
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

          debug += ` | Movement: ${meters.toFixed(1)}m`;

          if (speedMph > MAX_SPEED_MPH) {
            debug += ` (Speed exceeds validation limit)`;
          } else if (meters >= MIN_METERS) {
            distanceRef.current += meters;
            setMovementCount(prev => prev + 1);
            setDistanceMiles(distanceRef.current / 1609.344);
            debug += ` ✓ Validated`;
            lastPosRef.current = coords;
          } else {
            debug += ` (Min ${MIN_METERS}m for validation)`;
          }
        } else {
          lastPosRef.current = coords;
          debug += ' | Initial position set';
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
    const validationTokens = finalMiles >= 1 ? Math.floor(finalMiles) : finalMiles >= 0.5 ? 0.5 : 0;
    
    try {
      await addDoc(collection(db, 'runs'), {
        wallet: wallet,
        distance: finalMiles,
        time: formatTime(elapsedTime),
        duration: elapsedTime,
        date: new Date().toISOString(),
        tokens: validationTokens,
        status: 'pending',
        gpsUpdates: updateCount,
        movements: movementCount,
        createdAt: new Date(),
        validationType: 'movement_data'
      });
      
      alert(
        `Movement Data Submitted for Validation\n\n` +
        `Distance: ${finalMiles.toFixed(3)} miles\n` +
        `Duration: ${formatTime(elapsedTime)}\n` +
        `Validation Pending: ${validationTokens} FYTS\n\n` +
        `Your movement data will be validated within 3-5 business days.\n` +
        `Tokens will be distributed upon successful validation.`
      );
      
      setShowHistory(true);
      setShowInstructions(false);
    } catch (error) {
      console.error('Error submitting movement data:', error);
      alert('Error submitting movement data. Please try again.');
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
    const password = prompt('Enter validation admin password:');
    if (password === 'Fyts123') {
      setIsAdmin(true);
    } else {
      alert('Invalid admin credentials');
    }
  };

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

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {showDisclaimer && (
        <Disclaimer 
          wallet={wallet}
          onAccept={() => setShowDisclaimer(false)}
        />
      )}

      <h1 style={{ textAlign: 'center', marginBottom: '5px' }}>
        FYTS Movement Validation Protocol
      </h1>
      <p style={{ textAlign: 'center', color: '#666', marginTop: '0', fontSize: '14px' }}>
        Decentralized Network Validation Through Movement Data
      </p>

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
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        fontSize: '12px'
      }}>
        <Link to="/terms" style={{ color: '#6c757d', marginRight: '10px' }}>
          Terms of Service
        </Link>
        <Link to="/privacy" style={{ color: '#6c757d' }}>
          Privacy Policy
        </Link>
      </div>

      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        backgroundColor: '#f5f5f5',
        borderRadius: '10px' 
      }}>
        {!wallet ? (
          <>
            <p style={{ textAlign: 'center', marginBottom: '15px', fontSize: '14px', color: '#666' }}>
              Connect your Polygon wallet to participate in network validation
            </p>
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
              Connect Wallet Address
            </button>
          </>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#28a745' }}>✓ </span>
              Network Validator: {wallet.substring(0, 6)}...{wallet.substring(38)}
            </div>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              style={{ 
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              {showHistory ? 'Hide' : 'Show'} Validation History
            </button>
          </div>
        )}
      </div>

      {showInstructions && wallet && !tracking && <Instructions />}
      {showHistory && wallet && <RunHistory wallet={wallet} />}

      <div style={{ 
        padding: '20px', 
        backgroundColor: tracking ? '#e8ffe8' : '#f5f5f5',
        borderRadius: '10px',
        border: tracking ? '2px solid #4CAF50' : '2px solid #ddd'
      }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>
          {tracking ? '📡 Validating Movement' : '🔐 Ready to Validate'}
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
            Submit Movement Data
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
              <div>📊 Data Points: {updateCount} | Validated: {movementCount}</div>
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
              Complete Validation
            </button>
          </div>
        )}
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#fff3cd',
        borderRadius: '5px',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        <strong>Network Notice:</strong> FYTS tokens are utility tokens for network validation only. 
        Not an investment. No monetary value guaranteed.
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
};

export default App;