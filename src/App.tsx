import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import AdminDashboard from './components/AdminDashboard';
import RunHistory from './components/RunHistory';
import Disclaimer from './components/Disclaimer';
import Instructions from './components/Instructions';
import TermsOfService from './legal/TermsOfService';
import PrivacyPolicy from './legal/PrivacyPolicy';
import './App.css';

// Simple Top 10 Leaderboard Component
const SimpleLeaderboard: React.FC = () => {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(
          collection(db, 'runs'),
          where('status', '==', 'approved')
        );
        
        const snapshot = await getDocs(q);
        const userStats: { [wallet: string]: any } = {};

        snapshot.forEach((doc) => {
          const run = doc.data();
          const wallet = run.wallet;
          
          if (!userStats[wallet]) {
            userStats[wallet] = { 
              wallet, 
              totalDistance: 0, 
              runCount: 0, 
              totalTokens: 0 
            };
          }
          
          userStats[wallet].totalDistance += run.distance || 0;
          userStats[wallet].runCount += 1;
          userStats[wallet].totalTokens += run.tokens || 0;
        });

        const leaderboard = Object.values(userStats)
          .sort((a: any, b: any) => b.totalDistance - a.totalDistance)
          .slice(0, 10);

        setLeaders(leaderboard);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard');
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '10px', marginTop: '10px' }}>
        Loading community leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '10px', marginTop: '10px' }}>
        {error}
      </div>
    );
  }

  const getRankEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${index + 1}`;
    }
  };

  return (
    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '10px', marginTop: '10px' }}>
      <h3 style={{ textAlign: 'center', margin: '0 0 15px 0' }}>
        Community Top 10
      </h3>
      
      <div style={{ 
        backgroundColor: '#d1ecf1', 
        padding: '12px', 
        borderRadius: '8px', 
        marginBottom: '15px', 
        fontSize: '12px',
        border: '1px solid #bee5eb'
      }}>
        <strong>Health First:</strong> This celebrates consistent, moderate movement. 
        Remember to take rest days and listen to your body. Sustainable activity is the goal.
      </div>

      {leaders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '30px',
          backgroundColor: 'white',
          borderRadius: '8px',
          color: '#666'
        }}>
          No approved activities yet. Be the first to validate your movement!
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          {leaders.map((leader, index) => (
            <div 
              key={leader.wallet} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 15px', 
                borderBottom: index < leaders.length - 1 ? '1px solid #dee2e6' : 'none',
                backgroundColor: index < 3 ? '#f8f9fa' : 'white'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px', minWidth: '30px' }}>
                  {getRankEmoji(index)}
                </span>
                <span style={{ fontWeight: 'bold' }}>
                  {leader.wallet.substring(0, 6)}...{leader.wallet.substring(leader.wallet.length - 4)}
                </span>
              </div>
              <div style={{ textAlign: 'right', fontSize: '14px' }}>
                <div style={{ fontWeight: 'bold', color: '#17a2b8' }}>
                  {leader.totalDistance.toFixed(1)} miles
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  {leader.runCount} runs • {leader.totalTokens} FYTS
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: 'white',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        Showing top 10 validators by total approved distance • Updated in real-time
      </div>
    </div>
  );
};

// Landing Page Content Component (shown when no wallet connected)
const LandingContent: React.FC<{ onConnectWallet: () => void }> = ({ onConnectWallet }) => {
  return (
    <div style={{ lineHeight: '1.6' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{
          backgroundColor: '#e8f5e8',
          padding: '15px',
          borderRadius: '8px',
          border: '2px solid #4CAF50',
          marginBottom: '20px'
        }}>
          <strong>Health First Approach:</strong> Sustainable, moderate movement validation 
          with built-in safety limits to prevent overexertion and promote long-term wellness.
        </div>
      </div>

      {/* How It Works */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          How FYTS Works
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ color: '#007bff', margin: '0 0 10px 0' }}>1. Connect Wallet</h3>
            <p style={{ margin: '0', fontSize: '14px' }}>
              Enter your Polygon wallet address to participate in the validation network. 
              No private keys required - just your public address.
            </p>
          </div>
          
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ color: '#28a745', margin: '0 0 10px 0' }}>2. Track Movement</h3>
            <p style={{ margin: '0', fontSize: '14px' }}>
              Use GPS tracking to validate your physical movement. The protocol 
              verifies distance and prevents cheating through multiple validation checks.
            </p>
          </div>
          
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ color: '#fd7e14', margin: '0 0 10px 0' }}>3. Earn Tokens</h3>
            <p style={{ margin: '0', fontSize: '14px' }}>
              Approved activities receive FYTS tokens (1 token per mile completed).
              Tokens are distributed within 3-5 business days after approval.
            </p>
          </div>
        </div>
      </div>

      {/* Health Guidelines */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#dc3545', borderBottom: '2px solid #dc3545', paddingBottom: '10px' }}>
          Health & Safety Guidelines
        </h2>
        
        <div style={{ 
          backgroundColor: '#fff3cd', 
          padding: '20px', 
          borderRadius: '10px',
          border: '1px solid #ffeaa7'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#856404' }}>
            Daily Safety Limits (For Your Protection)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>Activity Frequency</h4>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Maximum 2 validation sessions per day</li>
                <li>Rest days strongly encouraged</li>
                <li>No consecutive high-intensity days</li>
              </ul>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>Distance Limits</h4>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Daily maximum: 10 miles (for safety)</li>
                <li>Beginner recommendation: 1-3 miles</li>
                <li>Build up distance gradually</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Rules */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#fd7e14', borderBottom: '2px solid #fd7e14', paddingBottom: '10px' }}>
          Common Rejection Reasons
        </h2>
        
        <div style={{ 
          backgroundColor: '#ffebee', 
          padding: '20px', 
          borderRadius: '10px',
          border: '1px solid #f44336'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Safety Violations</h4>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>More than 2 activities in one day</li>
                <li>Exceeding 10-mile daily limit</li>
                <li>Suspicious speed patterns (too fast)</li>
                <li>Extremely long duration sessions</li>
                <li>Back-to-back high-intensity submissions</li>
              </ul>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Technical Issues</h4>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Poor GPS accuracy (>65m error)</li>
                <li>Inconsistent location data</li>
                <li>Too few GPS data points</li>
                <li>Teleporting or impossible movements</li>
                <li>Vehicle-speed patterns detected</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Token Information */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#6f42c1', borderBottom: '2px solid #6f42c1', paddingBottom: '10px' }}>
          FYTS Token Information
        </h2>
        
        <div style={{ 
          backgroundColor: '#f8f5ff', 
          padding: '20px', 
          borderRadius: '10px',
          border: '1px solid #6f42c1'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Token Details</h4>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Symbol: FYTS</li>
                <li>Network: Polygon</li>
                <li>1 FYTS per mile completed</li>
                <li>0.5 FYTS for 0.5-0.99 miles</li>
                <li>Distributed within 3-5 business days</li>
              </ul>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Important Notice</h4>
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#fff3cd',
                borderRadius: '5px',
                fontSize: '13px',
                color: '#856404'
              }}>
                FYTS tokens are utility tokens for network validation only. They are NOT an investment, 
                NOT securities, and have NO guaranteed monetary value.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connect Wallet CTA */}
      <div style={{ 
        textAlign: 'center', 
        backgroundColor: '#e8f5e8', 
        padding: '30px',
        borderRadius: '15px',
        border: '2px solid #4CAF50'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#2d5a2d' }}>
          Ready to Start Validating Movement?
        </h2>
        <p style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#495057' }}>
          Connect your Polygon wallet to join the validation network
        </p>
        <button
          onClick={onConnectWallet}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Connect Wallet & Get Started
        </button>
        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          Remember: Your health and safety come first
        </div>
      </div>
    </div>
  );
};

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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
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
    setShowLeaderboard(false);
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
      setShowLeaderboard(false);
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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {showDisclaimer && (
        <Disclaimer 
          wallet={wallet}
          onAccept={() => setShowDisclaimer(false)}
          onDecline={() => setShowDisclaimer(false)}
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

      {/* Show Landing Page Content When No Wallet Connected */}
      {!wallet ? (
        <LandingContent onConnectWallet={connectWallet} />
      ) : (
        <>
          {/* Connected Wallet - Show App Interface */}
          <div style={{ 
            marginBottom: '20px', 
            padding: '20px', 
            backgroundColor: '#f5f5f5',
            borderRadius: '10px' 
          }}>
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <span style={{ color: '#28a745' }}>✓ </span>
              Network Validator: {wallet.substring(0, 6)}...{wallet.substring(38)}
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '8px',
              marginBottom: '10px'
            }}>
              <button 
                onClick={() => {
                  setShowHistory(!showHistory);
                  if (!showHistory) setShowLeaderboard(false);
                }}
                style={{ 
                  padding: '10px 12px',
                  fontSize: '14px',
                  backgroundColor: showHistory ? '#28a745' : '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                {showHistory ? 'Hide' : 'My'} History
              </button>
              
              <button 
                onClick={() => {
                  setShowLeaderboard(!showLeaderboard);
                  if (!showLeaderboard) setShowHistory(false);
                }}
                style={{ 
                  padding: '10px 12px',
                  fontSize: '14px',
                  backgroundColor: showLeaderboard ? '#28a745' : '#fd7e14',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                {showLeaderboard ? 'Hide' : 'Top 10'}
              </button>
            </div>
          </div>

          {showInstructions && !tracking && !showHistory && !showLeaderboard && <Instructions />}
          {showHistory && <RunHistory wallet={wallet} />}
          {showLeaderboard && <SimpleLeaderboard />}

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
                style={{
                  padding: '15px 30px',
                  fontSize: '18px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
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
        </>
      )}
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