import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

interface LeaderboardEntry {
  wallet: string;
  totalDistance: number;
  totalTokens: number;
  runCount: number;
  avgDistance: number;
  lastActivity: string;
}

const Leaderboard: React.FC = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let startDate: Date;
        const now = new Date();
        
        switch (view) {
          case 'weekly':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'alltime':
            startDate = new Date(0);
            break;
        }

        const q = query(
          collection(db, 'runs'),
          where('status', '==', 'approved'),
          where('date', '>=', startDate.toISOString())
        );

        const querySnapshot = await getDocs(q);
        const runsMap: { [wallet: string]: any[] } = {};

        querySnapshot.forEach((doc) => {
          const run = doc.data();
          if (!runsMap[run.wallet]) {
            runsMap[run.wallet] = [];
          }
          runsMap[run.wallet].push(run);
        });

        const leaderboardData: LeaderboardEntry[] = Object.keys(runsMap).map(wallet => {
          const runs = runsMap[wallet];
          const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
          const totalTokens = runs.reduce((sum, run) => sum + run.tokens, 0);
          const runCount = runs.length;
          const avgDistance = totalDistance / runCount;
          const lastActivity = runs.reduce((latest, run) => 
            new Date(run.date) > new Date(latest) ? run.date : latest, runs[0].date);

          return {
            wallet,
            totalDistance,
            totalTokens,
            runCount,
            avgDistance,
            lastActivity
          };
        });

        // Sort by total distance, but cap at reasonable limits for health
        leaderboardData.sort((a, b) => b.totalDistance - a.totalDistance);
        
        setLeaders(leaderboardData.slice(0, 20)); // Top 20
        setLoading(false);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [view]);

  const formatWallet = (wallet: string) => {
    return `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`;
  };

  const getRankEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🏃';
    }
  };

  const getHealthBadge = (distance: number, days: number) => {
    const dailyAvg = distance / days;
    if (dailyAvg <= 3) return { emoji: '🌱', text: 'Consistent Mover', color: '#28a745' };
    if (dailyAvg <= 6) return { emoji: '💪', text: 'Active Validator', color: '#17a2b8' };
    if (dailyAvg <= 10) return { emoji: '🏃', text: 'Strong Runner', color: '#fd7e14' };
    return { emoji: '⚠️', text: 'High Activity', color: '#dc3545' };
  };

  const getViewDays = () => {
    switch (view) {
      case 'weekly': return 7;
      case 'monthly': return 30;
      case 'alltime': return 365; // Use 1 year for calculation
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading community leaderboard...
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '10px',
      marginTop: '10px'
    }}>
      <h3 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>
        Community Leaderboard
      </h3>

      {/* Health Disclaimer */}
      <div style={{
        backgroundColor: '#d1ecf1',
        border: '1px solid #bee5eb',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          Healthy Movement Reminder
        </div>
        <div style={{ fontSize: '12px', color: '#0c5460' }}>
          This leaderboard celebrates consistent, healthy movement within reasonable limits. 
          Always prioritize rest, recovery, and listen to your body. Consult healthcare 
          professionals for exercise guidance.
        </div>
      </div>

      {/* Time Period Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px',
        gap: '10px'
      }}>
        {(['weekly', 'monthly', 'alltime'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setView(period)}
            style={{
              padding: '8px 16px',
              backgroundColor: view === period ? '#007bff' : '#e9ecef',
              color: view === period ? 'white' : '#495057',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
              textTransform: 'capitalize'
            }}
          >
            {period === 'alltime' ? 'All Time' : period}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {leaders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          color: '#666'
        }}>
          No validated activities yet for this time period. 
          Be the first to start moving and validating!
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          {leaders.map((leader, index) => {
            const healthBadge = getHealthBadge(leader.totalDistance, getViewDays());
            
            return (
              <div
                key={leader.wallet}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 2fr 1fr 1fr 1fr 1.5fr',
                  gap: '15px',
                  padding: '15px',
                  borderBottom: index < leaders.length - 1 ? '1px solid #dee2e6' : 'none',
                  alignItems: 'center',
                  backgroundColor: index < 3 ? '#f8f9fa' : 'transparent'
                }}
              >
                <div style={{
                  fontSize: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <div>{getRankEmoji(index)}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    #{index + 1}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {formatWallet(leader.wallet)}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: healthBadge.color,
                    marginTop: '2px'
                  }}>
                    {healthBadge.emoji} {healthBadge.text}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', color: '#17a2b8' }}>
                    {leader.totalDistance.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    miles
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                    {leader.totalTokens}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    FYTS
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {leader.runCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    activities
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '11px' }}>
                  <div style={{ color: '#666' }}>
                    Avg: {leader.avgDistance.toFixed(1)}mi
                  </div>
                  <div style={{ color: '#999' }}>
                    Last: {new Date(leader.lastActivity).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Community Stats */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: 'white',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
          Community Impact ({view === 'alltime' ? 'All Time' : view})
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>
              {leaders.length}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>Active Validators</div>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#17a2b8' }}>
              {leaders.reduce((sum, l) => sum + l.totalDistance, 0).toFixed(0)}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>Total Miles</div>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
              {leaders.reduce((sum, l) => sum + l.totalTokens, 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>FYTS Distributed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;