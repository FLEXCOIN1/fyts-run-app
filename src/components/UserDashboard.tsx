import React from 'react';

interface Run {
  id: string;
  date: string;
  distance: number;
  status: string;
  tokens: number;
}

const UserDashboard: React.FC = () => {
  const mockRuns: Run[] = [
    { id: '001', date: '2025-09-13', distance: 3.1, status: 'Pending', tokens: 3 },
    { id: '002', date: '2025-09-12', distance: 0.7, status: 'Approved', tokens: 0.5 },
  ];

  return (
    <div style={{padding: '20px', marginTop: '20px'}}>
      <h2>Your Run History</h2>
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead>
          <tr style={{borderBottom: '1px solid #ccc'}}>
            <th>Date</th>
            <th>Distance (mi)</th>
            <th>Status</th>
            <th>Tokens</th>
          </tr>
        </thead>
        <tbody>
          {mockRuns.map(run => (
            <tr key={run.id}>
              <td>{run.date}</td>
              <td>{run.distance}</td>
              <td>{run.status}</td>
              <td>{run.tokens}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserDashboard;