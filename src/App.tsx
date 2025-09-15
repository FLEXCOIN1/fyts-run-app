import React, { useState } from 'react';
import DisclaimerModal from './components/DisclaimerModal';
import './App.css';

// Wallet Connect Component
const WalletConnect: React.FC = () => {
  const [wallet, setWallet] = useState<string>('');
  const [error, setError] = useState<string>('');

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        setWallet(accounts[0]);
        setError('');
      } catch (err) {
        setError('Connection failed. Try MetaMask mobile browser.');
      }
    } else {
      setError('Install MetaMask or use dApp browser');
    }
  };

  return (
    <div>
      {!wallet ? (
        <>
          <button onClick={connectWallet}>Connect Wallet</button>
          {error && <p style={{color: 'red', fontSize: '14px'}}>{error}</p>}
        </>
      ) : (
        <p>✓ {wallet.substring(0, 6)}...{wallet.substring(38)}</p>
      )}
    </div>
  );
};

// GPS Run Tracker Component
const RunTracker: React.FC = () => {
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [lastPos, setLastPos] = useState<{lat: number, lon: number} | null>(null);
  const [error, setError] = useState('');
  const [watchId, setWatchId] = useState<number | null>(null);

  const startTracking = async () => {
    setError('');
    
    // Request permission first
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        setError('Location access denied. Enable in settings.');
        return;
      }
    } catch (e) {
      console.log('Permission API not supported');
    }

    // Get initial position to trigger permission prompt
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTracking(true);
        setDistance(0);
        setLastPos({ 
          lat: position.coords.latitude, 
          lon: position.coords.longitude 
        });
        
        // Start watching position
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            
            if (lastPos) {
              // Calculate distance using Haversine formula
              const R = 3959; // Earth radius in miles
              const dLat = (latitude - lastPos.lat) * Math.PI / 180;
              const dLon = (longitude - lastPos.lon) * Math.PI / 180;
              const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lastPos.lat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const dist = R * c;
              
              if (dist > 0.001) { // Only update if moved more than ~5 feet
                setDistance(prev => prev + dist);
                setLastPos({ lat: latitude, lon: longitude });
              }
            }
          },
          (err) => setError(`GPS Error: ${err.message}`),
          { 
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
        setWatchId(id);
      },
      (err) => {
        setError(`Can't access GPS: ${err.message}. Check settings.`);
      },
      { enableHighAccuracy: true }
    );
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    setTracking(false);
    const tokens = distance >= 1 ? Math.floor(distance) : distance >= 0.5 ? 0.5 : 0;
    alert(`Run complete!\nDistance: ${distance.toFixed(2)} mi\nTokens earned: ${tokens} FYTS (pending approval)`);
    setLastPos(null);
    setWatchId(null);
  };

  return (
    <div style={{padding: '20px', border: '2px solid #4CAF50', borderRadius: '10px', marginTop: '20px'}}>
      <h2>🏃 Live GPS Tracking</h2>
      {!tracking ? (
        <button 
          onClick={startTracking}
          style={{backgroundColor: '#4CAF50', color: 'white', fontSize: '18px', padding: '10px 20px'}}
        >
          Start Run
        </button>
      ) : (
        <div>
          <h3>🔴 Recording...</h3>
          <p style={{fontSize: '24px', fontWeight: 'bold'}}>
            {distance.toFixed(3)} miles
          </p>
          <button 
            onClick={stopTracking}
            style={{backgroundColor: '#f44336', color: 'white', fontSize: '18px', padding: '10px 20px'}}
          >
            Stop Run
          </button>
        </div>
      )}
      {error && <p style={{color: 'red'}}>{error}</p>}
    </div>
  );
};

function App() {
  const [accepted, setAccepted] = useState(false);

  if (!accepted) {
    return <DisclaimerModal onAccept={() => setAccepted(true)} />;
  }

  return (
    <div className="App">
      <h1>FYTS Run Tracker</h1>
      <WalletConnect />
      <RunTracker />
    </div>
  );
}

export default App;