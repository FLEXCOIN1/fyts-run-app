import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  unit: string;
  reward: number;
  icon: string;
  color: string;
}

interface PerformanceChallengesProps {
  wallet: string;
  username: string;
}

const PerformanceChallenges: React.FC<PerformanceChallengesProps> = ({ wallet, username }) => {
  const [challenges] = useState<Challenge[]>([
    {
      id: 'sprint_5k',
      title: '5K Sprint',
      description: 'Complete a 5K run (3.1 miles) in a single session',
      target: 3.1,
      unit: 'miles',
      reward: 10,
      icon: '⚡',
      color: '#FF0080'
    },
    {
      id: 'marathon_week',
      title: 'Weekly Marathon',
      description: 'Run 26.2 miles total in one week',
      target: 26.2,
      unit: 'miles',
      reward: 50,
      icon: '🏃',
      color: '#00F5FF'
    },
    {
      id: 'consistency_streak',
      title: '7-Day Streak',
      description: 'Complete at least 1 mile for 7 consecutive days',
      target: 7,
      unit: 'days',
      reward: 25,
      icon: '🔥',
      color: '#FFD700'
    },
    {
      id: 'speed_demon',
      title: 'Speed Demon',
      description: 'Complete a mile under 8 minutes',
      target: 8,
      unit: 'min/mile',
      reward: 15,
      icon: '💨',
      color: '#00FF88'
    },
    {
      id: 'endurance_master',
      title: 'Endurance Master',
      description: 'Run 50 miles total (lifetime)',
      target: 50,
      unit: 'miles',
      reward: 100,
      icon: '🎯',
      color: '#9B59B6'
    },
    {
      id: 'century_club',
      title: 'Century Club',
      description: 'Reach 100 total miles validated',
      target: 100,
      unit: 'miles',
      reward: 250,
      icon: '👑',
      color: '#E74C3C'
    }
  ]);

  const [userStats, setUserStats] = useState({
    totalDistance: 0,
    totalRuns: 0,
    longestRun: 0,
    fastestPace: 0,
    currentStreak: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const q = query(
          collection(db, 'runs'),
          where('wallet', '==', wallet),
          where('status', '==', 'approved')
        );
        const snapshot = await getDocs(q);
        
        let totalDistance = 0;
        let longestRun = 0;
        let fastestPace = Infinity;
        const runs: any[] = [];

        snapshot.forEach((doc) => {
          const run = doc.data();
          totalDistance += run.distance || 0;
          if (run.distance > longestRun) longestRun = run.distance;
          
          const pace = run.duration / 60 / run.distance;
          if (pace < fastestPace && pace > 0) fastestPace = pace;
          
          runs.push({
            distance: run.distance,
            date: new Date(run.date)
          });
        });

        // Calculate streak
        runs.sort((a, b) => b.date.getTime() - a.date.getTime());
        let streak = 0;
        let lastDate: Date | null = null;

        for (const run of runs) {
          if (!lastDate) {
            streak = 1;
            lastDate = run.date;
          } else {
            const daysDiff = Math.floor(
              (lastDate.getTime() - run.date.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysDiff === 1) {
              streak++;
              lastDate = run.date;
            } else if (daysDiff > 1) {
              break;
            }
          }
        }

        setUserStats({
          totalDistance,
          totalRuns: runs.length,
          longestRun,
          fastestPace: fastestPace === Infinity ? 0 : fastestPace,
          currentStreak: streak
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user stats:', error);
        setLoading(false);
      }
    };

    if (wallet) {
      fetchUserStats();
    }
  }, [wallet]);

  const calculateProgress = (challenge: Challenge): number => {
    switch (challenge.id) {
      case 'sprint_5k':
        return Math.min((userStats.longestRun / challenge.target) * 100, 100);
      case 'marathon_week':
        return Math.min((userStats.totalDistance / challenge.target) * 100, 100);
      case 'consistency_streak':
        return Math.min((userStats.currentStreak / challenge.target) * 100, 100);
      case 'speed_demon':
        if (userStats.fastestPace === 0) return 0;
        return Math.min(100, Math.max(0, (1 - (userStats.fastestPace - challenge.target) / challenge.target) * 100));
      case 'endurance_master':
        return Math.min((userStats.totalDistance / challenge.target) * 100, 100);
      case 'century_club':
        return Math.min((userStats.totalDistance / challenge.target) * 100, 100);
      default:
        return 0;
    }
  };

  const isCompleted = (challenge: Challenge): boolean => {
    return calculateProgress(challenge) >= 100;
  };

  if (loading) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '20px',
        padding: '32px',
        marginTop: '20px',
        textAlign: 'center',
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

      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#00F5FF' }}>
              {userStats.totalDistance.toFixed(1)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Total Miles</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FF0080' }}>
              {userStats.totalRuns}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Total Runs</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FFD700' }}>
              {userStats.longestRun.toFixed(1)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Longest Run</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#00FF88' }}>
              {userStats.currentStreak}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Day Streak</div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {challenges.map((challenge) => {
          const progress = calculateProgress(challenge);
          const completed = isCompleted(challenge);

          return (
            <div
              key={challenge.id}
              style={{
                background: completed
                  ? `linear-gradient(135deg, ${challenge.color}15, ${challenge.color}25)`
                  : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${completed ? challenge.color + '40' : 'rgba(255, 255, 255, 0.05)'}`,
                borderRadius: '12px',
                padding: '20px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {completed && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: challenge.color,
                  color: '#0F0F23',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  COMPLETED
                </div>
              )}

              <div style={{
                fontSize: '2rem',
                marginBottom: '12px'
              }}>
                {challenge.icon}
              </div>

              <h4 style={{
                margin: '0 0 8px 0',
                color: '#E2E8F0',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}>
                {challenge.title}
              </h4>

              <p style={{
                margin: '0 0 16px 0',
                color: '#94A3B8',
                fontSize: '0.9rem',
                lineHeight: '1.4'
              }}>
                {challenge.description}
              </p>

              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                height: '8px',
                overflow: 'hidden',
                marginBottom: '12px'
              }}>
                <div style={{
                  background: `linear-gradient(90deg, ${challenge.color}, ${challenge.color}dd)`,
                  height: '100%',
                  width: `${progress}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.85rem'
              }}>
                <span style={{ color: '#94A3B8' }}>
                  {progress.toFixed(0)}% Complete
                </span>
                <span style={{
                  color: challenge.color,
                  fontWeight: '600'
                }}>
                  +{challenge.reward} FYTS
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'rgba(0, 245, 255, 0.05)',
        borderRadius: '12px',
        textAlign: 'center',
        fontSize: '0.9rem',
        color: '#94A3B8'
      }}>
        Complete challenges to earn bonus FYTS tokens on top of your regular activity rewards!
      </div>
    </div>
  );
};

export default PerformanceChallenges;