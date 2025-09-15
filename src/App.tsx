import React, { useState } from 'react';
import './App.css';

const App: React.FC = () => {
  const [wallet, setWallet] = useState<string>('');
  const [tracking, setTracking] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  const [distance, setDistance] = useState(0);
  const [lastPos, setLastPos] = useState<{lat: number, lon: number} | null>(null);
  
  // Wallet connection with manual fallback
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setWallet(accounts[0]);
      } catch {
        const address = prompt('Enter your wallet address (0x...):');
        if (address && address.startsWith('0x')) {
          setWallet(address);
        }
      }
    } else {
      const address = prompt('No wallet detected. Enter your wallet address:');
      if (address && address.startsWith('0x')) {
        setWallet(address);
      }
    }
  };

  // GPS tracking
  const startTracking = () => {
    if (!wallet) {
      alert('Please connect wallet first');
      return;
    }

    setTracking(true);
    setDistance(0);
    
    navigator.geolocation.watchPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        
        setCoords(newPos);
        
        // Calculate distance if we have a previous position
        if (lastPos) {
          const R = 3959; // Earth radius in miles
          const dLat = (newPos.lat - lastPos.lat) * Math.PI / 180;
          const dLon = (newPos.lon - lastPos.lon) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lastPos.lat * Math.PI / 180) * Math.cos(newPos.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const dist = R * c;
          
          if (dist > 0.001) { // Only add if moved >5 feet
            setDistance(prev => prev + dist);
          }
        }
        
        setLastPos(newPos);
      },
      (error) => {
        alert('GPS error: ' + error.message);
        setTracking(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const stopTracking = () => {
    setTracking(false);
    const tokens = distance >= 1 ? Math.floor(distance) : distance >= 0.5 ? 0.5 : 0;
    
    // Save run data (would send to backend)
    const runData = {
      wallet,
      distance: distance.toFixed(2),
      tokens,
      timestamp: new Date().toISOString()
    };
    
    console.log('Run saved:', runData);
    alert(`Run complete!\nDistance: ${distance.toFixed(2)} miles\nTokens earned: ${tokens} FYTS`);
    
    // Reset for next run
    setLastPos(null);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>FYTS Run Tracker</h1>
      
      {/* Wallet Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '10px' }}>
        {!wallet ? (
          <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px' }}>
            Connect/Enter Wallet
          </button>
        ) : (
          <p>Wallet: {wallet.substring(0, 6)}...{wallet.substring(38)}</p>
        )}
      </div>

      {/* GPS Tracking Section */}
      <div style={{ padding: '20px', border: '2px solid #4CAF50', borderRadius: '10px' }}>
        <h2>GPS Tracking</h2>
        {!tracking ? (
          <button 
            onClick={startTracking} 
            disabled={!wallet}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px',
              backgroundColor: wallet ? '#4CAF50' : '#ccc',
              color: 'white'
            }}
          >
            Start Run
          </button>
        ) : (
          <div>
            <p>📍 Tracking...</p>
            <p>Distance: {distance.toFixed(3)} miles</p>
            {coords && <p style={{ fontSize: '12px' }}>
              {coords.lat.toFixed(6)}, {coords.lon.toFixed(6)}
            </p>}
            <button 
              onClick={stopTracking}
              style={{ 
                padding: '10px 20px', 
                fontSize: '16px',
                backgroundColor: '#f44336',
                color: 'white'
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