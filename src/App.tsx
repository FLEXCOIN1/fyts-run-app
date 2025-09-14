import React, { useState } from 'react';
import DisclaimerModal from './components/DisclaimerModal';
import './App.css';

// Inline WalletConnect Component
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

// Inline RunTracker Component  
const RunTracker: React.FC = () => {
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [lastPos, setLastPos] = useState<{lat: number, lon: number} | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('GPS not available');
      return;
    }

    setTracking(true);
    setDistance(0);
    setError('');
    
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (lastPos) {
          const R = 3959; // Earth radius in miles
          const dLat = (latitude - lastPos.lat) * Math.PI / 180;
          const dLon = (longitude - lastPos.lon) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lastPos.lat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const dist = R * c;
          
          setDistance(prev => prev + dist);
        }
        
        setLastPos({ lat: latitude, lon: longitude });
      },
      (err) => {
        setError(`GPS Error: ${err.message}`);
        setTracking(false);
      },
      { 
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
    
    setWatchId(id);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    setTracking(false);
    
    const tokens = distance >= 1 ? Math.floor(distance) : distance >= 0.5 ? 0.5 : 0;
    alert(`Run complete!\nDistance: ${distance.toFixed(2)} mi\nTokens earned: ${tokens} FYTS`);
    
    // Reset for next run
    setLastPos(null);
    setWatchId(null);
  };

  return (
    <div style={{padding: '20px', border: '2px solid #4CAF50', borderRadius: '10px', marginTop: '20px'}}>
      <h2>🏃 Live GPS Tracking</h2>
      {!tracking ? (
        <button 
          onClick={startTracking}
          style={{backgroundColor: '#4CAF50', color: 'white', fontSize: '18px'}}
        >
          Start Run
        </button>
      ) : (
        <div>
          <h3>🔴 Recording...</h3>
          <p style={{fontSize: '24px'}}>
            {distance.toFixed(2)} miles
          </p>
          <button 
            onClick={stopTracking}
            style={{backgroundColor: '#f44336', color: 'white', fontSize: '18px'}}
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