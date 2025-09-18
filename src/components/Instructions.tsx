import React from 'react';

const Instructions: React.FC = () => {
  return (
    <div style={{
      marginTop: '20px',
      padding: '20px',
      backgroundColor: '#e3f2fd',
      borderRadius: '10px'
    }}>
      <h3 style={{ marginTop: 0 }}>How Movement Validation Works</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Step 1: Connect Your Wallet</strong>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
          Enter your Polygon wallet address manually. This identifies you in the validation network.
        </p>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Step 2: Submit Movement Data</strong>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
          Click "Submit Movement Data" and allow GPS tracking. Move at least 0.5 miles to generate valid data for the network.
        </p>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Step 3: Network Validation</strong>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
          Your movement data is reviewed to ensure it meets network validation requirements. 
          This process typically takes 3-5 business days.
        </p>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Step 4: Receive Validation Tokens</strong>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
          Once validated, FYTS tokens are distributed to your wallet as recognition for 
          contributing to network security. Tokens represent your validation contributions only.
        </p>
      </div>
      
      <div style={{
        padding: '10px',
        backgroundColor: '#fff3cd',
        borderRadius: '5px',
        marginTop: '15px'
      }}>
        <strong>⚠️ Important:</strong> FYTS tokens are utility tokens for network participation only. 
        They are not an investment, have no guaranteed monetary value, and should not be purchased 
        with expectation of profit.
      </div>
    </div>
  );
};

export default Instructions;