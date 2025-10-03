import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';

interface PerformanceChallenge {
  id: string;
  creatorWallet: string;
  creatorUsername: string;
  distance: number;
  time: string;
  duration: number;
  wagerAmount: number;
  totalPot: number;
  runId: string;
  participants: Array<{
    wallet: string;
    username: string;
    runId: string;
    distance: number;
    duration: number;
    verified: boolean;
    timestamp: any;
  }>;
  createdAt: any;
  expiresAt: any;
  status: 'open' | 'closed' | 'completed';
  winnerId?: string;
  winnerUsername?: string;
}

interface PerformanceChallengesProps {
  wallet: string;
  username: string;
}

export const PerformanceChallenges: React.FC<PerformanceChallengesProps> = ({ wallet, username }) => {
  const [challenges, setChallenges] = useState<PerformanceChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'my_challenges'>('browse');

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const q = query(collection(db, 'performance_challenges'), where('status', '==', 'open'));
      const snapshot = await getDocs(q);
      const fetchedChallenges: PerformanceChallenge[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedChallenges.push({
          id: doc.id,
          ...data
        } as PerformanceChallenge);
      });

      setChallenges(fetchedChallenges);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      setLoading(false);
    }
  };

  const acceptChallenge = async (challenge: PerformanceChallenge) => {
    if (!wallet || !username) {
      alert('Please connect your wallet first');
      return;
    }

    const userConfirmed = window.confirm(
      `Accept challenge from ${challenge.creatorUsername}?\n\n` +
      `Target: ${challenge.distance.toFixed(2)} miles in ${challenge.time}\n` +
      `Wager: ${challenge.wagerAmount} FYTS\n\n` +
      `You'll need to complete a run within 24 hours from now.`
    );

    if (!userConfirmed) return;

    alert('Challenge accepted! Complete your run and it will be automatically submitted for verification.');
    fetchChallenges();
  };

  const isExpired = (expiresAt: any) => {
    if (!expiresAt) return false;
    const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return new Date() > expiry;
  };

  const getTimeRemaining = (expiresAt: any) => {
    if (!expiresAt) return 'Unknown';
    const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

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
        Loading challenges...
      </div>
    );
  }

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
        Performance Challenges
      </h3>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => setActiveTab('browse')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'browse' ? 'linear-gradient(135deg, #00F5FF, #FF0080)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'browse' ? '#0F0F23' : '#E2E8F0',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Browse Challenges
        </button>
        <button
          onClick={() => setActiveTab('my_challenges')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'my_challenges' ? 'linear-gradient(135deg, #00F5FF, #FF0080)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'my_challenges' ? '#0F0F23' : '#E2E8F0',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          My Challenges
        </button>
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div>
          {challenges.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              color: '#64748B'
            }}>
              No open challenges available. Complete a run and create one!
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '24px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', color: '#00F5FF', marginBottom: '4px' }}>
                        Challenge by {challenge.creatorUsername}
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#E2E8F0' }}>
                        {challenge.distance.toFixed(2)} miles in {challenge.time}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#FFD700' }}>
                        {challenge.wagerAmount} FYTS
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                        Pot: {challenge.totalPot} FYTS
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
                      Time remaining: <span style={{ color: '#00FF88', fontWeight: '500' }}>
                        {getTimeRemaining(challenge.expiresAt)}
                      </span>
                    </div>
                    <button
                      onClick={() => acceptChallenge(challenge)}
                      disabled={challenge.creatorWallet === wallet || isExpired(challenge.expiresAt)}
                      style={{
                        padding: '10px 20px',
                        background: challenge.creatorWallet === wallet || isExpired(challenge.expiresAt) 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'linear-gradient(135deg, #00F5FF, #00FF88)',
                        color: challenge.creatorWallet === wallet || isExpired(challenge.expiresAt) ? '#64748B' : '#0F0F23',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: challenge.creatorWallet === wallet || isExpired(challenge.expiresAt) ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem'
                      }}
                    >
                      {challenge.creatorWallet === wallet ? 'Your Challenge' : 
                       isExpired(challenge.expiresAt) ? 'Expired' : 'Accept Challenge'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Challenges Tab */}
      {activeTab === 'my_challenges' && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          color: '#64748B'
        }}>
          Your created and accepted challenges will appear here
        </div>
      )}
    </div>
  );
};

export default PerformanceChallenges;