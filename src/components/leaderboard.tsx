import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface LeaderboardEntry {
  wallet: string;
  totalDistance: number;
  totalTokens: number;
  runCount: number;
  avgDistance: number;
  dailyAvg: number;
  lastActivity: string;
}

const Leaderboard: React.FC = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const getFirebaseLeaderboard = async (period: 'daily' | 'weekly' | 'monthly') => {
    try {
      let cutoffDate: Date;
      const now = new Date();
      
      switch (period) {
        case 'daily':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'weekly':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const q = query(
        collection(db, 'runs'),
        where('status', '==', 'approved'),
        where('date', '>=', cutoffDate.toISOString())
      );

      const snapshot = await getDocs(q);
      const userStats: { [wallet: string]: any } = {};

      snapshot.forEach((doc) => {
        const run = doc.data();
        const wallet = run.wallet;
        const distance = run.distance || 0;
        const tokens = run.tokens || 0;
        const runDate = run.date;

        if (!userStats[wallet]) {
          userStats[wallet] = {
            wallet,
            totalDistance: 0,
            totalTokens: 0,
            runCount: 0,
            dates: []
          };
        }

        userStats[wallet].totalDistance += distance;
        userStats[wallet].totalTokens += tokens;
        userStats[wallet].runCount += 1;
        userStats[wallet].dates.push(runDate);
      });

      // Convert to leaderboard entries with health metrics
      const periodDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
      
      const leaderboardData: LeaderboardEntry[] = Object.values(userStats).map((stats: any) => {
        const avgDistance = stats.totalDistance / stats.runCount;
        const dailyAvg = stats.totalDistance / periodDays;
        const lastActivity = stats.dates.reduce((latest: string, date: string) => 
          new Date(date) > new Date(latest) ? date : latest, stats.dates[0]);

        return {
          wallet: stats.wallet,
          totalDistance: stats.totalDistance,
          totalTokens: stats.totalTokens,
          runCount: stats.runCount,
          avgDistance,
          dailyAvg,
          lastActivity
        };
      });

      // Sort by total distance
      leaderboardData.sort((a, b) => b.totalDistance - a.totalDistance);
      
      return leaderboardData.slice(0, 20); // Top 20
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      throw err;
    }
  };

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getFirebaseLeaderboard(view);
        setLeaders(data);
      } catch (err) {
        setError('Failed to load leaderboard data');
      } finally {
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

  const getHealthBadge = (dailyAvg: number) => {
    if (dailyAvg <= 2) return { emoji: '🌱', text: 'Healthy Pace', color: '#28a745' };
    if (dailyAvg <= 4) return { emoji: '💪', text: 'Active', color: '#17a2b8' };
    if (dailyAvg <= 6) return { emoji: '🏃', text: 'Very Active', color: '#fd7e14' };
    return { emoji: '⚠️', text: 'High Volume - Rest Days Important', color: '#dc3545' };
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        marginTop: '10px'
      }}>
        Loading community leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        borderRadius: '10px',
        marginTop: '10px'
      }}>
        {error}
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
        <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#0c5460' }}>
          Health First Approach
        </div>
        <div style={{ fontSize: '12px', color: '#0c5460' }}>
          This leaderboard celebrates consistent, sustainable movement. Always prioritize 
          rest days, proper recovery, and listen to your body. Consult healthcare professionals 
          for exercise guidance. High volume warnings indicate when rest may be needed.
        </div>
      </div>

      {/* Period Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px',
        gap: '8px'
      }}>
        {(['daily', 'weekly', 'monthly'] as const).map((period) => (
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
            {period}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '10px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
            {leaders.length}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>Validators</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#17a2b8' }}>
            {leaders.reduce((sum, l) => sum + l.totalDistance, 0).toFixed(0)}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>Miles</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
            {leaders.reduce((sum, l) => sum + l.totalTokens, 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>FYTS</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fd7e14' }}>
            {leaders.reduce((sum, l) => sum + l.runCount, 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>Activities</div>
        </div>
      </div>

      {/* Leaderboard List */}
      {leaders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          color: '#666'
        }}>
          No approved activities yet for this period. Be the first to validate your movement!
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '50px 2fr 1fr 1fr 1fr 1.5fr',
            gap: '10px',
            padding: '12px 15px',
            backgroundColor: '#e9ecef',
            fontWeight: 'bold',
            fontSize: '11px',
            textTransform: 'uppercase'
          }}>
            <div>Rank</div>
            <div>Validator</div>
            <div>Distance</div>
            <div>Activities</div>
            <div>Tokens</div>
            <div>Health Status</div>
          </div>

          {leaders.map((leader, index) => {
            const healthBadge = getHealthBadge(leader.dailyAvg);
            
            return (
              <div
                key={leader.wallet}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 2fr 1fr 1fr 1fr 1.5fr',
                  gap: '10px',
                  padding: '12px 15px',
                  borderBottom: index < leaders.length - 1 ? '1px solid #dee2e6' : 'none',
                  alignItems: 'center',
                  backgroundColor: index < 3 ? '#f8f9fa' : 'transparent',
                  fontSize: '14px'
                }}
              >
                <div style={{
                  fontSize: '18px',
                  textAlign: 'center'
                }}>
                  <div>{getRankEmoji(index)}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    #{index + 1}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {formatWallet(leader.wallet)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    Last: {new Date(leader.lastActivity).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', color: '#17a2b8' }}>
                    {leader.totalDistance.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    miles
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {leader.runCount}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    runs
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                    {leader.totalTokens}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    FYTS
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '10px',
                    padding: '3px 6px',
                    borderRadius: '10px',
                    backgroundColor: healthBadge.color,
                    color: 'white',
                    fontWeight: 'bold',
                    marginBottom: '3px'
                  }}>
                    {healthBadge.emoji} {healthBadge.text}
                  </div>
                  <div style={{ fontSize: '9px', color: '#666' }}>
                    {leader.dailyAvg.toFixed(1)} mi/day avg
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: '15px',
        padding: '12px',
        backgroundColor: 'white',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        Showing {view} leaderboard • Only approved validation activities count • 
        Rankings promote healthy, sustainable movement patterns
      </div>
    </div>
  );
};

export default Leaderboard;