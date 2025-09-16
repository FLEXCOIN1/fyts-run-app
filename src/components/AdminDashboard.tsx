import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';

interface Run {
  id: string;
  wallet: string;
  distance: number;
  time: string;
  duration: number;
  date: string;
  tokens: number;
  status: 'pending' | 'approved' | 'rejected';
  gpsUpdates: number;
  movements: number;
}

const AdminDashboard: React.FC = () => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const runsQuery = query(collection(db, 'runs'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(runsQuery);
      const runsData: Run[] = [];
      
      querySnapshot.forEach((doc) => {
        runsData.push({
          id: doc.id,
          ...doc.data()
        } as Run);
      });
      
      setRuns(runsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading runs:', error);
      setLoading(false);
    }
  };

  const updateRunStatus = async (runId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const runRef = doc(db, 'runs', runId);
      await updateDoc(runRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setRuns(runs.map(run => 
        run.id === runId ? { ...run, status: newStatus } : run
      ));
      
      alert(`Run ${newStatus}!`);
    } catch (error) {
      console.error('Error updating run:', error);
      alert('Error updating run status');
    }
  };

  const filteredRuns = runs.filter(run => {
    if (filter === 'all') return true;
    return run.status === filter;
  });

  const getTotalPendingTokens = () => {
    return runs
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.tokens, 0);
  };

  const getTotalApprovedTokens = () => {
    return runs
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.tokens, 0);
  };

  const exportApprovedRuns = () => {
    const approved = runs.filter(r => r.status === 'approved' && r.tokens > 0);
    const csv = approved.map(r => `${r.wallet},${r.tokens}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'approved-runs.csv';
    a.click();
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading runs...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0