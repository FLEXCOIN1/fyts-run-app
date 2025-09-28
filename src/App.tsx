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

// Contract interaction hooks
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

const useContractData = () => {
  const { contract } = useContract();
  const [burnStats, setBurnStats] = useState({ burned: '0', remaining: '0', burnPercentage: '0' });
  const [halvingInfo, setHalvingInfo] = useState({ currentPeriod: '0', currentRate: '0', nextHalvingIn: '0' });
  const [nextBurnTime, setNextBurnTime] = useState('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBurnStats({ burned: '150000000000000000000000', remaining: '850000000000000000000000', burnPercentage: '1500' });
      setHalvingInfo({ currentPeriod: '0', currentRate: '1000000000000000000', nextHalvingIn: '12960000' });
      setNextBurnTime('86400');
      setLoading(false);
    }, 10000);

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

// Staking Interface Component
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
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '20px',
      padding: '32px',
      marginTop: '20px'
    }}>
      <h3 style={{ 
        textAlign: 'center', 
        marginBottom: '24px', 
        color: '#E2E8F0',
        fontSize: '1.5rem',
        fontWeight: '600'
      }}>
        Staking Interface
      </h3>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '20px', 
          borderRadius: '12px', 
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#00F5FF', marginBottom: '8px' }}>Your Balance</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#E2E8F0' }}>{formatTokenAmount(userBalance)} FYTS</div>
        </div>
        
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '20px', 
          borderRadius: '12px', 
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#FF0080', marginBottom: '8px' }}>Staked Amount</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#E2E8F0' }}>{formatTokenAmount(stakedAmount)} FYTS</div>
        </div>

        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '20px', 
          borderRadius: '12px', 
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#FFD700', marginBottom: '8px' }}>Reward Multiplier</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#E2E8F0' }}>{getMultiplierText()}</div>
        </div>
      </div>

      {!stakeActive ? (
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.02)', 
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#E2E8F0', fontSize: '1.1rem' }}>Stake FYTS Tokens</h4>
          <p style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '20px' }}>
            Minimum stake: 25 FYTS. Higher stakes unlock reward multipliers.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <input
              type="number"
              placeholder="Amount to stake"
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontSize: '16px',
                color: '#E2E8F0',
                outline: 'none'
              }}
              min="25"
              step="1"
            />
            <button
              onClick={handleStake}
              disabled={loading || !stakeInput || parseFloat(stakeInput) < 25}
              style={{
                padding: '12px 24px',
                background: loading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #00F5FF, #00FF88)',
                color: loading ? '#64748B' : '#0F0F23',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              {loading ? 'Staking...' : 'Stake'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.02)', 
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#E2E8F0', fontSize: '1.1rem' }}>Active Stake</h4>
          <p style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '20px' }}>
            You have {formatTokenAmount(stakedAmount)} FYTS staked with {getMultiplierText()} rewards.
          </p>
          
          <button
            onClick={handleUnstake}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: loading ? 'rgba(255, 255, 255, 0.1)' : '#FF4757',
              color: loading ? '#64748B' : 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {loading ? 'Unstaking...' : 'Unstake All'}
          </button>
        </div>
      )}
    </div>
  );
};

// Leaderboard Component
const SimpleLeaderboard: React.FC = () => {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(collection(db, 'runs'), where('status', '==', 'approved'));
        const snapshot = await getDocs(q);
        const userStats: { [wallet: string]: any } = {};

        snapshot.forEach((doc) => {
          const run = doc.data();
          const wallet = run.wallet;
          
          if (!userStats[wallet]) {
            userStats[wallet] = { wallet, totalDistance: 0, runCount: 0, totalTokens: 0 };
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
        setError('Failed to load leaderboard');
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        padding: '32px', 
        textAlign: 'center', 
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '20px', 
        marginTop: '20px',
        color: '#94A3B8'
      }}>
        Loading community leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '32px', 
        textAlign: 'center', 
        background: 'rgba(255, 71, 87, 0.1)',
        borderRadius: '20px', 
        marginTop: '20px',
        color: '#FF4757'
      }}>
        {error}
      </div>
    );
  }

  const getRankEmoji = (index: number) => {
    switch (index) {
      case 0: return '1st';
      case 1: return '2nd';
      case 2: return '3rd';
      default: return `${index + 1}th`;
    }
  };

  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '20px', 
      padding: '32px', 
      marginTop: '20px' 
    }}>
      <h3 style={{ 
        textAlign: 'center', 
        margin: '0 0 24px 0',
        color: '#E2E8F0',
        fontSize: '1.5rem',
        fontWeight: '600'
      }}>
        Community Top 10
      </h3>

      {leaders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          color: '#64748B'
        }}>
          No approved activities yet. Be the first to validate your movement!
        </div>
      ) : (
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.02)', 
          borderRadius: '12px', 
          overflow: 'hidden'
        }}>
          {leaders.map((leader, index) => (
            <div 
              key={leader.wallet} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px', 
                borderBottom: index < leaders.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px', minWidth: '30px', color: '#00F5FF' }}>
                  {getRankEmoji(index)}
                </span>
                <span style={{ fontWeight: '600', color: '#E2E8F0' }}>
                  {leader.wallet.substring(0, 6)}...{leader.wallet.substring(leader.wallet.length - 4)}
                </span>
              </div>
              <div style={{ textAlign: 'right', fontSize: '14px' }}>
                <div style={{ fontWeight: '600', color: '#00F5FF' }}>
                  {leader.totalDistance.toFixed(1)} miles
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  {leader.runCount} runs • {leader.totalTokens} FYTS
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Landing Page Content Component
const LandingContent: React.FC<{ onConnectWallet: () => void }> = ({ onConnectWallet }) => {
  const [activeUsers, setActiveUsers] = useState(34);
  const [activeTab, setActiveTab] = useState('overview');
  const { burnStats, halvingInfo, nextBurnTime, loading } = useContractData();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(prev => {
        const newCount = prev + Math.floor(Math.random() * 2);
        return newCount > 50 ? 34 : newCount;
      });
    }, 8000);
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

  return (
    <div style={{ lineHeight: '1.6' }}>
      {/* Hero Section */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '40px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '24px',
        padding: '48px 32px'
      }}>
        <h1 style={{ 
          fontSize: '3.5rem', 
          margin: '0 0 16px 0', 
          fontWeight: '700',
          background: 'linear-gradient(135deg, #00F5FF, #FF0080, #00FF88)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          FYTS Protocol
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          margin: '0 0 24px 0', 
          color: '#94A3B8' 
        }}>
          Transform Movement Into Digital Assets • {activeUsers} active validators
        </p>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          marginTop: '32px',
          flexWrap: 'wrap'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: '700', 
              color: '#00F5FF',
              marginBottom: '4px'
            }}>{activeUsers}</div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#64748B'
            }}>Active Validators</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: '700', 
              color: '#FF0080',
              marginBottom: '4px'
            }}>1,247</div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#64748B'
            }}>Miles Validated</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: '700', 
              color: '#00FF88',
              marginBottom: '4px'
            }}>TBD</div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#64748B'
            }}>Market Cap</div>
          </div>
        </div>
      </div>

      {/* Social Media Section */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '40px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '20px',
        padding: '32px'
      }}>
        <h3 style={{ 
          margin: '0 0 24px 0', 
          color: '#E2E8F0',
          fontSize: '1.5rem',
          fontWeight: '600'
        }}>Join Our Community</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '12px',
          maxWidth: '600px',
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
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '14px',
              gap: '8px',
              color: '#E2E8F0'
            }}
          >
            Instagram
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
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '14px',
              gap: '8px',
              color: '#E2E8F0'
            }}
          >
            Twitter/X
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
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '14px',
              gap: '8px',
              color: '#E2E8F0'
            }}
          >
            Telegram
          </a>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '30px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '20px',
        padding: '8px',
        flexWrap: 'wrap',
        gap: '4px'
      }}>
        {[
          { id: 'overview', label: 'How It Works' },
          { id: 'tokenomics', label: 'Tokenomics' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderRadius: '12px',
              background: activeTab === tab.id ? 'linear-gradient(135deg, #00F5FF, #FF0080)' : 'transparent',
              color: activeTab === tab.id ? '#0F0F23' : '#94A3B8',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '24px' 
          }}>
            {[
              {
                icon: 'Connect',
                title: '1. Connect Protocol',
                desc: 'Link your Polygon wallet to join the decentralized movement validation network.',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              },
              {
                icon: 'Validate',
                title: '2. Validate Movement', 
                desc: 'Advanced GPS algorithms verify authentic physical activity with anti-spoofing technology.',
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              },
              {
                icon: 'Earn',
                title: '3. Earn Tokens',
                desc: 'Receive FYTS tokens for validated activity. Stake tokens for enhanced rewards.',
                gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              }
            ].map((card, index) => (
              <div key={index} style={{ 
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '20px',
                padding: '32px'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: card.gradient,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  marginBottom: '24px',
                  fontWeight: '600',
                  color: 'white'
                }}>{card.icon}</div>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  color: '#E2E8F0',
                  fontSize: '1.3rem',
                  fontWeight: '600'
                }}>
                  {card.title}
                </h3>
                <p style={{ 
                  margin: '0', 
                  color: '#94A3B8'
                }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tokenomics' && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '30px', 
            borderRadius: '20px'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                Loading live contract data...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '25px',
                  borderRadius: '15px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#E2E8F0' }}>Burn Statistics</h4>
                  <div style={{ fontSize: '14px', color: '#94A3B8' }}>
                    <div style={{ marginBottom: '8px' }}><strong>Total Burned:</strong> {formatTokenAmount(burnStats.burned)} FYTS</div>
                    <div style={{ marginBottom: '8px' }}><strong>Remaining:</strong> {formatTokenAmount(burnStats.remaining)} FYTS</div>
                    <div style={{ marginBottom: '8px' }}><strong>Burned %:</strong> {(parseInt(burnStats.burnPercentage) / 100).toFixed(2)}%</div>
                    <div><strong>Next Burn:</strong> {formatTime(nextBurnTime)}</div>
                  </div>
                </div>
                
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '25px',
                  borderRadius: '15px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#E2E8F0' }}>Current Halving Period</h4>
                  <div style={{ fontSize: '14px', color: '#94A3B8' }}>
                    <div style={{ marginBottom: '8px' }}><strong>Period:</strong> Months 1-6</div>
                    <div style={{ marginBottom: '8px' }}><strong>Rate:</strong> 1.0 FYTS per mile</div>
                    <div style={{ marginBottom: '8px' }}><strong>Next Halving:</strong> {formatTime(halvingInfo.nextHalvingIn)}</div>
                    <div><strong>Total Halvings:</strong> {halvingInfo.currentPeriod}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connect Wallet CTA */}
      <div style={{ 
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '24px',
        padding: '48px 32px'
      }}>
        <h2 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '2.2rem', 
          fontWeight: '700',
          color: '#E2E8F0'
        }}>
          Ready to Start Earning?
        </h2>
        <p style={{ 
          margin: '0 0 32px 0', 
          fontSize: '1.1rem', 
          color: '#94A3B8',
          maxWidth: '500px', 
          marginLeft: 'auto', 
          marginRight: 'auto' 
        }}>
          Join {activeUsers}+ validators earning FYTS tokens through verified movement
        </p>
        <button
          onClick={onConnectWallet}
          style={{
            padding: '20px 40px',
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#0F0F23',
            background: 'linear-gradient(135deg, #00F5FF, #00FF88)',
            border: 'none',
            borderRadius: '50px',
            cursor: 'pointer'
          }}
        >
          Connect Wallet & Start Earning
        </button>
      </div>
    </div>
  );
};

// Main App Component (GPS CODE UNCHANGED)
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
    const savedWallet = localStorage.getItem('fyts_wallet');
    if (savedWallet && savedWallet.startsWith('0x') && savedWallet.length === 42) {
      setWallet(savedWallet);
    }
  }, []);

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
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
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
    const savedWallet = localStorage.getItem('fyts_wallet');
    const address = prompt(
      `Enter your Polygon wallet address (0x...):\n\n${savedWallet ? `Previously used: ${savedWallet}` : ''}`,
      savedWallet || ''
    );
    
    if (address && address.startsWith('0x') && address.length === 42) {
      setWallet(address);
      localStorage.setItem('fyts_wallet', address);
    } else if (address !== null) {
      alert('Please enter a valid Polygon wallet address');
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    if (window.confirm('Are you sure you want to disconnect your wallet?')) {
      setWallet('');
      localStorage.removeItem('fyts_wallet');
      setShowHistory(false);
      setShowLeaderboard(false);
      setShowStaking(false);
      setShowInstructions(true);
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
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
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
      <div style={{ background: 'linear-gradient(135deg, #0F0F23 0%, #1A1A2E 50%, #16213E 100%)', minHeight: '100vh' }}>
        <button 
          onClick={() => setIsAdmin(false)}
          style={{ 
            position: 'fixed', 
            top: '20px', 
            right: '20px', 
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.03)',
            color: '#E2E8F0',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
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
    <div style={{ 
      background: 'linear-gradient(135deg, #0F0F23 0%, #1A1A2E 50%, #16213E 100%)',
      minHeight: '100vh',
      color: '#E2E8F0'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {showDisclaimer && (
          <Disclaimer 
            wallet={wallet}
            onAccept={() => setShowDisclaimer(false)}
            onDecline={() => setShowDisclaimer(false)}
          />
        )}

        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '8px',
          fontSize: '2.5rem',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #00F5FF, #FF0080)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          FYTS Movement Validation Protocol
        </h1>
        <p style={{ 
          textAlign: 'center', 
          color: '#94A3B8', 
          marginTop: '0', 
          fontSize: '16px',
          marginBottom: '40px'
        }}>
          Decentralized Network Validation Through Movement Data
        </p>

        <button
          onClick={checkAdminAccess}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '8px 16px',
            fontSize: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            color: '#64748B',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            opacity: 0.5,
            cursor: 'pointer'
          }}
        >
          Admin
        </button>

        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          fontSize: '12px'
        }}>
          <Link to="/terms" style={{ 
            color: '#64748B', 
            marginRight: '12px',
            textDecoration: 'none'
          }}>
            Terms of Service
          </Link>
          <Link to="/privacy" style={{ 
            color: '#64748B',
            textDecoration: 'none'
          }}>
            Privacy Policy
          </Link>
        </div>

        {!wallet ? (
          <LandingContent onConnectWallet={connectWallet} />
        ) : (
          <>
            <div style={{ 
              marginBottom: '24px', 
              padding: '24px', 
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <span style={{ color: '#00FF88', fontSize: '16px' }}>✓ </span>
                  <span style={{ color: '#E2E8F0', fontWeight: '500' }}>
                    Network Validator: {wallet.substring(0, 6)}...{wallet.substring(38)}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    background: 'rgba(255, 71, 87, 0.1)',
                    color: '#FF4757',
                    border: '1px solid rgba(255, 71, 87, 0.2)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Disconnect
                </button>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                gap: '12px'
              }}>
                <button 
                  onClick={() => {
                    setShowHistory(!showHistory);
                    if (!showHistory) setShowLeaderboard(false);
                  }}
                  style={{ 
                    padding: '12px 16px',
                    fontSize: '14px',
                    background: showHistory ? '#00F5FF' : 'rgba(255, 255, 255, 0.05)',
                    color: showHistory ? '#0F0F23' : '#E2E8F0',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '500'
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
                    padding: '12px 16px',
                    fontSize: '14px',
                    background: showLeaderboard ? '#FFD700' : 'rgba(255, 255, 255, 0.05)',
                    color: showLeaderboard ? '#0F0F23' : '#E2E8F0',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {showLeaderboard ? 'Hide' : 'Top'} 10
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
                    padding: '12px 16px',
                    fontSize: '14px',
                    background: showStaking ? '#FF0080' : 'rgba(255, 255, 255, 0.05)',
                    color: showStaking ? '#0F0F23' : '#E2E8F0',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '500'
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
              padding: '32px', 
              background: tracking ? 'rgba(0, 255, 136, 0.05)' : 'rgba(255, 255, 255, 0.03)',
              borderRadius: '20px',
              border: tracking ? '2px solid #00FF88' : '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <h2 style={{ 
                textAlign: 'center', 
                margin: '0 0 24px 0',
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#E2E8F0'
              }}>
                {tracking ? 'Validating Movement' : 'Ready to Validate'}
              </h2>

              {!tracking ? (
                <button
                  onClick={startTracking}
                  style={{
                    padding: '20px 40px',
                    fontSize: '18px',
                    background: 'linear-gradient(135deg, #00F5FF, #00FF88)',
                    color: '#0F0F23',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    width: '100%',
                    fontWeight: '600'
                  }}
                >
                  Submit Movement Data
                </button>
              ) : (
                <div>
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    padding: '24px', 
                    borderRadius: '12px',
                    marginBottom: '20px',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '3rem', 
                      fontWeight: '700', 
                      color: '#00FF88',
                      marginBottom: '8px'
                    }}>
                      {distanceMiles.toFixed(3)} mi
                    </div>
                    <div style={{ 
                      color: '#94A3B8', 
                      fontSize: '1.1rem'
                    }}>
                      {formatTime(elapsedTime)} | Pace: {calculatePace()} /mi
                    </div>
                  </div>

                  <div style={{ 
                    background: 'rgba(0, 245, 255, 0.05)', 
                    padding: '16px', 
                    borderRadius: '12px',
                    marginBottom: '20px',
                    fontSize: '12px'
                  }}>
                    <div style={{ color: '#94A3B8', marginBottom: '8px' }}>
                      Data Points: {updateCount} | Validated: {movementCount}
                    </div>
                    <div style={{ color: '#00F5FF' }}>
                      {debugInfo}
                    </div>
                    {currentPosition && (
                      <div style={{ marginTop: '8px', color: '#64748B' }}>
                        {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={stopTracking}
                    style={{
                      padding: '20px 40px',
                      fontSize: '18px',
                      background: '#FF4757',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50px',
                      cursor: 'pointer',
                      width: '100%',
                      fontWeight: '600'
                    }}
                  >
                    Complete Validation
                  </button>
                </div>
              )}
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: 'rgba(255, 215, 0, 0.05)',
              borderRadius: '12px',
              fontSize: '12px',
              textAlign: 'center',
              color: '#94A3B8'
            }}>
              <strong style={{ color: '#FFD700' }}>Network Notice:</strong> FYTS tokens are utility tokens for network validation only. 
              Not an investment. No monetary value guaranteed.
            </div>
          </>
        )}
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