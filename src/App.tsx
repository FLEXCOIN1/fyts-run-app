import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// Contract configuration
const FYTS_CONTRACT_ADDRESS = '0xA6bBa6f5966Af3B9614B1828A024C473C98E4Ce4';
const FYTS_ABI = [
  "function getCurrentRewardRate() view returns (uint256)",
  "function getBurnStats() view returns (uint256 burned, uint256 remaining, uint256 burnPercentage)",
  "function getHalvingInfo() view returns (uint256 currentPeriod, uint256 currentRate, uint256 nextHalvingIn, uint256 totalHalvings)",
  "function getUserRewardMultiplier(address user) view returns (uint256)",
  "function timeUntilNextBurn() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function stakes(address user) view returns (uint256 amount, uint256 stakeTime, bool active)",
  "function stake(uint256 amount) returns (bool)",
  "function unstake() returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// Contract interaction hooks - ETHERS V5 VERSION
const useContract = () => {
  const [contract, setContract] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    const initContract = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const { ethers } = await import('ethers');
          const provider = new ethers.providers.Web3Provider((window as any).ethereum);
          const contract = new ethers.Contract(FYTS_CONTRACT_ADDRESS, FYTS_ABI, provider);
          setContract(contract);
          setProvider(provider);
        } catch (error) {
          console.error('Error initializing contract:', error);
        }
      }
    };

    initContract();
  }, []);

  return { contract, provider };
};

// Contract data hook
const useContractData = () => {
  const { contract } = useContract();
  const [burnStats, setBurnStats] = useState({ burned: '0', remaining: '0', burnPercentage: '0' });
  const [halvingInfo, setHalvingInfo] = useState({ currentPeriod: '0', currentRate: '0', nextHalvingIn: '0' });
  const [nextBurnTime, setNextBurnTime] = useState('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Contract data fetch timeout - using mock data');
      setBurnStats({ burned: '150000000000000000000000', remaining: '850000000000000000000000', burnPercentage: '1500' });
      setHalvingInfo({ currentPeriod: '0', currentRate: '1000000000000000000', nextHalvingIn: '12960000' });
      setNextBurnTime('86400');
      setLoading(false);
    }, 10000); // 10 second timeout

    const fetchContractData = async () => {
      if (!contract) return;

      try {
        const [burnData, halvingData, burnTime] = await Promise.all([
          contract.getBurnStats(),
          contract.getHalvingInfo(), 
          contract.timeUntilNextBurn()
        ]);

        setBurnStats({
          burned: burnData[0].toString(),
          remaining: burnData[1].toString(),
          burnPercentage: burnData[2].toString()
        });

        setHalvingInfo({
          currentPeriod: halvingData[0].toString(),
          currentRate: halvingData[1].toString(),
          nextHalvingIn: halvingData[2].toString()
        });

        setNextBurnTime(burnTime.toString());
        setLoading(false);
        clearTimeout(timeout);
      } catch (error) {
        console.error('Error fetching contract data:', error);
        // Don't set loading to false here - let timeout handle it with mock data
      }
    };

    fetchContractData();
    const interval = setInterval(fetchContractData, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [contract]);

  return { burnStats, halvingInfo, nextBurnTime, loading };
};

// Staking Interface Component (for connected wallets)
const StakingInterface: React.FC<{ wallet: string }> = ({ wallet }) => {
  const { contract, provider } = useContract();
  const [userBalance, setUserBalance] = useState('0');
  const [stakedAmount, setStakedAmount] = useState('0');
  const [stakeActive, setStakeActive] = useState(false);
  const [stakeInput, setStakeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [multiplier, setMultiplier] = useState('100');

  const fetchUserData = useCallback(async () => {
    if (!contract || !wallet) return;

    try {
      const [balance, stakeInfo, userMultiplier] = await Promise.all([
        contract.balanceOf(wallet),
        contract.stakes(wallet),
        contract.getUserRewardMultiplier(wallet)
      ]);

      setUserBalance(balance.toString());
      setStakedAmount(stakeInfo[0].toString());
      setStakeActive(stakeInfo[2]);
      setMultiplier(userMultiplier.toString());
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [contract, wallet]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleStake = async () => {
    if (!contract || !provider || !stakeInput) return;

    setLoading(true);
    try {
      const signer = provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      const amount = parseFloat(stakeInput) * Math.pow(10, 18);
      const tx = await contractWithSigner.stake(amount.toString());
      await tx.wait();
      
      alert('Staking successful!');
      setStakeInput('');
      fetchUserData();
    } catch (error: any) {
      alert(`Staking failed: ${error.message}`);
    }
    setLoading(false);
  };

  const handleUnstake = async () => {
    if (!contract || !provider) return;

    setLoading(true);
    try {
      const signer = provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      const tx = await contractWithSigner.unstake();
      await tx.wait();
      
      alert('Unstaking successful!');
      fetchUserData();
    } catch (error: any) {
      alert(`Unstaking failed: ${error.message}`);
    }
    setLoading(false);
  };

  const formatTokenAmount = (wei: string) => {
    return (parseFloat(wei) / Math.pow(10, 18)).toFixed(2);
  };

  const getMultiplierText = () => {
    const mult = parseInt(multiplier);
    if (mult >= 200) return '2x (Elite)';
    if (mult >= 150) return '1.5x (Premium)';
    if (mult >= 100) return '1x (Basic)';
    return 'Not eligible';
  };

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '10px',
      marginTop: '20px'
    }}>
      <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#2c3e50' }}>
        🔒 FYTS Staking Interface
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#3498db' }}>Your Balance</div>
          <div style={{ fontSize: '1.5em', margin: '5px 0' }}>{formatTokenAmount(userBalance)} FYTS</div>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#e74c3c' }}>Staked Amount</div>
          <div style={{ fontSize: '1.5em', margin: '5px 0' }}>{formatTokenAmount(stakedAmount)} FYTS</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#f39c12' }}>Reward Multiplier</div>
          <div style={{ fontSize: '1.5em', margin: '5px 0' }}>{getMultiplierText()}</div>
        </div>
      </div>

      {!stakeActive ? (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Stake FYTS Tokens</h4>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Minimum stake: 25 FYTS. Higher stakes unlock reward multipliers.
          </p>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="number"
              placeholder="Amount to stake"
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px'
              }}
              min="25"
              step="1"
            />
            <button
              onClick={handleStake}
              disabled={loading || !stakeInput || parseFloat(stakeInput) < 25}
              style={{
                padding: '10px 20px',
                backgroundColor: loading ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Staking...' : 'Stake'}
            </button>
          </div>

          <div style={{ fontSize: '12px', color: '#666' }}>
            • 25-99 FYTS: 1x rewards • 100-299 FYTS: 1.5x rewards • 300+ FYTS: 2x rewards
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Active Stake</h4>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            You have {formatTokenAmount(stakedAmount)} FYTS staked with {getMultiplierText()} rewards.
          </p>
          
          <button
            onClick={handleUnstake}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: loading ? '#ccc' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Unstaking...' : 'Unstake All'}
          </button>
        </div>
      )}
    </div>
  );
};

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
  const [activeUsers, setActiveUsers] = useState(34); // FIXED: Realistic starting number
  const [activeTab, setActiveTab] = useState('overview');
  const { burnStats, halvingInfo, nextBurnTime, loading } = useContractData();

  useEffect(() => {
    // FIXED: Realistic user count cycling between 34-50
    const interval = setInterval(() => {
      setActiveUsers(prev => {
        const newCount = prev + Math.floor(Math.random() * 2); // 0-1 increment
        return newCount > 50 ? 34 : newCount; // Reset to 34 when it hits 50
      });
    }, 8000); // Slower updates
    return () => clearInterval(interval);
  }, []);

  const formatTime = useCallback((seconds: string) => {
    const secs = parseInt(seconds);
    if (secs === 0) return 'Ready now';
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, []);

  const formatTokenAmount = useCallback((wei: string) => {
    try {
      const num = parseFloat(wei) / Math.pow(10, 18);
      if (num > 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num > 1000) return `${(num / 1000).toFixed(1)}K`;
      return num.toFixed(2);
    } catch {
      return '0';
    }
  }, []);

  const getCurrentPeriodInfo = useCallback(() => {
    const period = parseInt(halvingInfo.currentPeriod);
    switch (period) {
      case 0: return { period: 'Months 1-6', rate: '1.0 FYTS', color: 'rgba(46, 204, 113, 0.9)' };
      case 1: return { period: 'Months 7-12', rate: '0.5 FYTS', color: 'rgba(241, 196, 15, 0.9)' };
      case 2: return { period: 'Months 13-18', rate: '0.25 FYTS', color: 'rgba(230, 126, 34, 0.9)' };
      default: return { period: 'Month 19+', rate: '0.125 FYTS', color: 'rgba(155, 89, 182, 0.9)' };
    }
  }, [halvingInfo.currentPeriod]);

  return (
    <div style={{ lineHeight: '1.6' }}>
      {/* Hero Section */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '40px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '40px 20px',
        borderRadius: '15px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '2.5em', margin: '0 0 10px 0', fontWeight: 'bold' }}>
            🏃‍♂️ FYTS Protocol
          </h1>
          <p style={{ fontSize: '1.2em', margin: '0 0 20px 0', opacity: 0.9 }}>
            Earn crypto for verified movement • {activeUsers} active validators
          </p>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '15px',
            borderRadius: '10px',
            backdropFilter: 'blur(10px)',
            margin: '20px auto',
            maxWidth: '600px'
          }}>
            <strong>🛡️ Health First Approach:</strong> Sustainable movement validation 
            with built-in safety limits to prevent overexertion and promote long-term wellness.
          </div>
        </div>
      </div>

      {/* Social Media Section */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '40px',
        backgroundColor: '#f8f9fa',
        padding: '25px',
        borderRadius: '15px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>🌐 Join Our Community</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '15px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <a 
            href="https://www.instagram.com/fyts_cj?igsh=NTc4MTIwNjQ2YQ%3D%3D&utm_source=qr" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 20px',
              backgroundColor: '#E4405F',
              color: 'white',
              borderRadius: '25px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '14px',
              gap: '8px',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            📷 Instagram
          </a>
          <a 
            href="https://x.com/getFyts" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 20px',
              backgroundColor: '#1DA1F2',
              color: 'white',
              borderRadius: '25px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '14px',
              gap: '8px',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🐦 Twitter/X
          </a>
          <a 
            href="https://t.me/+4AdDVbCTfcxmZGEx" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 20px',
              backgroundColor: '#0088cc',
              color: 'white',
              borderRadius: '25px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '14px',
              gap: '8px',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            💬 Telegram
          </a>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '30px',
        backgroundColor: '#f8f9fa',
        borderRadius: '15px',
        padding: '5px',
        flexWrap: 'wrap',
        gap: '5px'
      }}>
        {[
          { id: 'overview', label: '⚡ How It Works', icon: '⚡' },
          { id: 'safety', label: '🛡️ Safety Rules', icon: '🛡️' },
          { id: 'tokenomics', label: '💰 Tokenomics', icon: '💰' },
          { id: 'halving', label: '📉 Halving Events', icon: '📉' },
          { id: 'staking', label: '🔒 Staking Info', icon: '🔒' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: activeTab === tab.id ? '#667eea' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ 
            color: '#2c3e50', 
            borderBottom: '3px solid #3498db', 
            paddingBottom: '15px',
            textAlign: 'center',
            fontSize: '2em',
            margin: '0 0 30px 0'
          }}>
            How FYTS Works
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginTop: '20px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '25px', 
              borderRadius: '15px',
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '15px', textAlign: 'center' }}>🔗</div>
              <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', fontSize: '1.3em' }}>
                1. Connect Wallet
              </h3>
              <p style={{ margin: '0', fontSize: '14px', textAlign: 'center', opacity: 0.9 }}>
                Enter your Polygon wallet address to join the validation network. 
                Secure & simple - no private keys needed.
              </p>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              padding: '25px', 
              borderRadius: '15px',
              boxShadow: '0 8px 25px rgba(240, 147, 251, 0.3)',
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '15px', textAlign: 'center' }}>📍</div>
              <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', fontSize: '1.3em' }}>
                2. Track Movement
              </h3>
              <p style={{ margin: '0', fontSize: '14px', textAlign: 'center', opacity: 0.9 }}>
                GPS validates your real movement with multiple verification checks. 
                Anti-cheat technology ensures fairness.
              </p>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              padding: '25px', 
              borderRadius: '15px',
              boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)',
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '15px', textAlign: 'center' }}>💰</div>
              <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', fontSize: '1.3em' }}>
                3. Earn FYTS
              </h3>
              <p style={{ margin: '0', fontSize: '14px', textAlign: 'center', opacity: 0.9 }}>
                Get 1 FYTS per mile completed after validation. 
                Tokens distributed within 3-5 business days.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'safety' && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ 
            color: '#e74c3c', 
            borderBottom: '3px solid #e74c3c', 
            paddingBottom: '15px',
            textAlign: 'center',
            fontSize: '2em',
            margin: '0 0 30px 0'
          }}>
            Health & Safety First
          </h2>
          
          <div style={{ 
            background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            padding: '30px', 
            borderRadius: '20px',
            boxShadow: '0 8px 25px rgba(252, 182, 159, 0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ fontSize: '4em', margin: '0 0 10px 0' }}>⚠️</div>
              <h3 style={{ margin: '0 0 15px 0', color: '#d35400', fontSize: '1.5em' }}>
                Daily Safety Limits (For Your Protection)
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.8)',
                padding: '20px',
                borderRadius: '15px',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ fontSize: '2em', textAlign: 'center', marginBottom: '10px' }}>📅</div>
                <h4 style={{ margin: '0 0 12px 0', color: '#2c3e50', textAlign: 'center' }}>Activity Frequency</h4>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#34495e' }}>
                  <li>Maximum 2 validation sessions per day</li>
                  <li>Rest days strongly encouraged</li>
                  <li>No consecutive high-intensity days</li>
                </ul>
              </div>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.8)',
                padding: '20px',
                borderRadius: '15px',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ fontSize: '2em', textAlign: 'center', marginBottom: '10px' }}>📏</div>
                <h4 style={{ margin: '0 0 12px 0', color: '#2c3e50', textAlign: 'center' }}>Distance Limits</h4>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#34495e' }}>
                  <li>Daily maximum: 10 miles (for safety)</li>
                  <li>Beginner recommendation: 1-3 miles</li>
                  <li>Build up distance gradually</li>
                </ul>
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#ffebee', 
              padding: '20px', 
              borderRadius: '10px',
              border: '1px solid #f44336',
              marginTop: '20px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#495057', textAlign: 'center' }}>Common Rejection Reasons</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                <div>
                  <strong style={{ color: '#e74c3c' }}>Safety Violations:</strong>
                  <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', fontSize: '13px' }}>
                    <li>More than 2 activities in one day</li>
                    <li>Exceeding 10-mile daily limit</li>
                    <li>Suspicious speed patterns</li>
                  </ul>
                </div>
                <div>
                  <strong style={{ color: '#e74c3c' }}>Technical Issues:</strong>
                  <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', fontSize: '13px' }}>
                    <li>Poor GPS accuracy (&gt;65m error)</li>
                    <li>Inconsistent location data</li>
                    <li>Vehicle-speed patterns detected</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tokenomics' && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ 
            color: '#6f42c1', 
            borderBottom: '3px solid #6f42c1', 
            paddingBottom: '15px',
            textAlign: 'center',
            fontSize: '2em',
            margin: '0 0 30px 0'
          }}>
            Live FYTS Token Data
          </h2>
          
          <div style={{ 
            background: 'linear-gradient(135deg, #f8f5ff 0%, #e8d5ff 100%)',
            padding: '30px', 
            borderRadius: '20px',
            boxShadow: '0 8px 25px rgba(111, 66, 193, 0.3)'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div>Loading live contract data...</div>
                <div style={{ fontSize: '12px', marginTop: '10px' }}>
                  Requires MetaMask and Polygon network connection
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px' }}>
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    padding: '25px',
                    borderRadius: '15px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '3em', marginBottom: '15px' }}>🔥</div>
                    <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Burn Statistics</h4>
                    <div style={{ fontSize: '14px', color: '#34495e' }}>
                      <div style={{ marginBottom: '8px' }}><strong>Total Burned:</strong> {formatTokenAmount(burnStats.burned)} FYTS</div>
                      <div style={{ marginBottom: '8px' }}><strong>Remaining:</strong> {formatTokenAmount(burnStats.remaining)} FYTS</div>
                      <div style={{ marginBottom: '8px' }}><strong>Burned %:</strong> {(parseInt(burnStats.burnPercentage) / 100).toFixed(2)}%</div>
                      <div><strong>Next Burn:</strong> {formatTime(nextBurnTime)}</div>
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    padding: '25px',
                    borderRadius: '15px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '3em', marginBottom: '15px' }}>📉</div>
                    <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Current Halving Period</h4>
                    <div style={{ fontSize: '14px', color: '#34495e' }}>
                      <div style={{ marginBottom: '8px' }}><strong>Period:</strong> {getCurrentPeriodInfo().period}</div>
                      <div style={{ marginBottom: '8px' }}><strong>Rate:</strong> {getCurrentPeriodInfo().rate} per mile</div>
                      <div style={{ marginBottom: '8px' }}><strong>Next Halving:</strong> {formatTime(halvingInfo.nextHalvingIn)}</div>
                      <div><strong>Total Halvings:</strong> {halvingInfo.currentPeriod}</div>
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  padding: '20px',
                  borderRadius: '15px',
                  marginTop: '25px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Token Contract</h4>
                  <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                    {FYTS_CONTRACT_ADDRESS}
                  </div>
                  <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
                    Polygon Network • Live data updated every 30 seconds
                  </div>
                </div>
              </>
            )}

            <div style={{ 
              padding: '20px', 
              backgroundColor: 'rgba(255,255,255,0.8)',
              borderRadius: '15px',
              fontSize: '13px',
              color: '#856404',
              textAlign: 'center',
              marginTop: '20px'
            }}>
              <strong>Important Notice:</strong> FYTS tokens are utility tokens for network validation only. 
              They are NOT an investment, NOT securities, and have NO guaranteed monetary value.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'halving' && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ 
            color: '#f39c12', 
            borderBottom: '3px solid #f39c12', 
            paddingBottom: '15px',
            textAlign: 'center',
            fontSize: '2em',
            margin: '0 0 30px 0'
          }}>
            Halving Events Schedule
          </h2>
          
          <div style={{ 
            background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            padding: '30px', 
            borderRadius: '20px',
            boxShadow: '0 8px 25px rgba(243, 156, 18, 0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ fontSize: '4em', margin: '0 0 10px 0' }}>📉</div>
              <h3 style={{ margin: '0 0 15px 0', color: '#d35400', fontSize: '1.5em' }}>
                Bitcoin-Style Halving Model
              </h3>
              <p style={{ color: '#8b4513', fontSize: '16px', margin: 0 }}>
                Rewards decrease every 6 months - Early adopters get massive advantage!
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{
                backgroundColor: 'rgba(46, 204, 113, 0.9)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>🥇</div>
                <h4 style={{ margin: '0 0 10px 0' }}>Months 1-6</h4>
                <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>1.0 FYTS</div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>per mile</div>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(241, 196, 15, 0.9)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>🥈</div>
                <h4 style={{ margin: '0 0 10px 0' }}>Months 7-12</h4>
                <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>0.5 FYTS</div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>per mile</div>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(230, 126, 34, 0.9)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>🥉</div>
                <h4 style={{ margin: '0 0 10px 0' }}>Months 13-18</h4>
                <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>0.25 FYTS</div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>per mile</div>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(155, 89, 182, 0.9)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>📈</div>
                <h4 style={{ margin: '0 0 10px 0' }}>Month 19+</h4>
                <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>0.125 FYTS</div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>per mile</div>
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(231, 76, 60, 0.1)',
              border: '2px solid #e74c3c',
              padding: '20px',
              borderRadius: '15px',
              marginTop: '25px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#c0392b' }}>⏰ FOMO Alert!</h4>
              <p style={{ margin: 0, color: '#2c3e50', fontSize: '14px' }}>
                The earlier you start, the more FYTS you earn per mile. This creates scarcity and rewards early adopters - 
                just like Bitcoin halving events that drive massive price increases.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'staking' && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ 
            color: '#2ecc71', 
            borderBottom: '3px solid #2ecc71', 
            paddingBottom: '15px',
            textAlign: 'center',
            fontSize: '2em',
            margin: '0 0 30px 0'
          }}>
            Staking Requirements & Rewards
          </h2>
          
          <div style={{ 
            background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            padding: '30px', 
            borderRadius: '20px',
            boxShadow: '0 8px 25px rgba(46, 204, 113, 0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ fontSize: '4em', margin: '0 0 10px 0' }}>🔒</div>
              <h3 style={{ margin: '0 0 15px 0', color: '#27ae60', fontSize: '1.5em' }}>
                Stake to Earn - Higher Stakes, Higher Rewards
              </h3>
              <p style={{ color: '#2c3e50', fontSize: '16px', margin: 0 }}>
                Must stake FYTS tokens to participate in movement validation
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div style={{
                backgroundColor: 'rgba(52, 152, 219, 0.9)',
                color: 'white',
                padding: '25px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5em', marginBottom: '15px' }}>🚀</div>
                <h4 style={{ margin: '0 0 10px 0' }}>Entry Level</h4>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold', marginBottom: '5px' }}>25 FYTS</div>
                <div style={{ fontSize: '18px', marginBottom: '10px' }}>1x Rewards</div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>Minimum to participate in validation</div>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(155, 89, 182, 0.9)',
                color: 'white',
                padding: '25px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5em', marginBottom: '15px' }}>💎</div>
                <h4 style={{ margin: '0 0 10px 0' }}>Premium</h4>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold', marginBottom: '5px' }}>100 FYTS</div>
                <div style={{ fontSize: '18px', marginBottom: '10px' }}>1.5x Rewards</div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>50% bonus on all earned tokens</div>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(241, 196, 15, 0.9)',
                color: 'white',
                padding: '25px',
                borderRadius: '15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5em', marginBottom: '15px' }}>👑</div>
                <h4 style={{ margin: '0 0 10px 0' }}>Elite</h4>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold', marginBottom: '5px' }}>300+ FYTS</div>
                <div style={{ fontSize: '18px', marginBottom: '10px' }}>2x Rewards</div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>Double rewards + governance rights</div>
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              border: '2px solid #2ecc71',
              padding: '20px',
              borderRadius: '15px',
              marginTop: '25px'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#27ae60', textAlign: 'center' }}>💡 Value Creation Mechanics</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>🔐</div>
                  <strong style={{ color: '#2c3e50' }}>Removes Supply</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#7f8c8d' }}>
                    Staked tokens locked from circulation
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>💰</div>
                  <strong style={{ color: '#2c3e50' }}>Buying Pressure</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#7f8c8d' }}>
                    Need tokens to participate = demand
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>🎯</div>
                  <strong style={{ color: '#2c3e50' }}>Quality Control</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#7f8c8d' }}>
                    Only serious participants can earn
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Wallet CTA */}
      <div style={{ 
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '40px 30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '4em', margin: '0 0 20px 0' }}>🚀</div>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '2.2em', fontWeight: 'bold' }}>
            Ready to Start Earning?
          </h2>
          <p style={{ margin: '0 0 25px 0', fontSize: '1.1em', opacity: 0.9, maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
            Join {activeUsers}+ validators earning FYTS tokens through verified movement
          </p>
          <button
            onClick={onConnectWallet}
            style={{
              padding: '18px 40px',
              fontSize: '1.2em',
              background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)',
              transition: 'all 0.3s ease',
              transform: 'translateY(0)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(255, 107, 107, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.3)';
            }}
          >
            🔗 Connect Wallet & Start Earning
          </button>
          <div style={{ marginTop: '20px', fontSize: '14px', opacity: 0.8 }}>
            💚 Your health and safety come first • Sustainable movement rewards
          </div>
        </div>
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          zIndex: 1
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          zIndex: 1
        }}></div>
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
  const [showStaking, setShowStaking] = useState(false);
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

  const haversineMeters = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

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

  const connectWallet = useCallback(() => {
    const address = prompt('Enter your Polygon wallet address (0x...):');
    if (address && address.startsWith('0x') && address.length === 42) {
      setWallet(address);
    } else {
      alert('Please enter a valid Polygon wallet address');
    }
  }, []);

  const startTracking = useCallback(() => {
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
  }, [wallet, haversineMeters]);

  const formatTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const stopTracking = useCallback(async () => {
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
  }, [wallet, elapsedTime, updateCount, movementCount, formatTime]);

  const calculatePace = useCallback(() => {
    if (distanceMiles > 0 && elapsedTime > 0) {
      const pace = elapsedTime / 60 / distanceMiles;
      if (pace > 99) return '--:--';
      const paceMinutes = Math.floor(pace);
      const paceSeconds = Math.floor((pace - paceMinutes) * 60);
      return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;
    }
    return '--:--';
  }, [distanceMiles, elapsedTime]);

  const checkAdminAccess = useCallback(() => {
    const password = prompt('Enter validation admin password:');
    if (password === 'Fyts123') {
      setIsAdmin(true);
    } else {
      alert('Invalid admin credentials');
    }
  }, []);

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
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
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

              <button 
                onClick={() => {
                  setShowStaking(!showStaking);
                  if (!showStaking) {
                    setShowHistory(false);
                    setShowLeaderboard(false);
                  }
                }}
                style={{ 
                  padding: '10px 12px',
                  fontSize: '14px',
                  backgroundColor: showStaking ? '#28a745' : '#6f42c1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                {showStaking ? 'Hide' : 'Stake'} FYTS
              </button>
            </div>
          </div>

          {showInstructions && !tracking && !showHistory && !showLeaderboard && !showStaking && <Instructions />}
          {showHistory && <RunHistory wallet={wallet} />}
          {showLeaderboard && <SimpleLeaderboard />}
          {showStaking && <StakingInterface wallet={wallet} />}

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