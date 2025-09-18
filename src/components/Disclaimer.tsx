import React, { useState } from 'react';

interface DisclaimerProps {
  wallet?: string;
  onAccept: () => void;
  onDecline: () => void;
}

const Disclaimer: React.FC<DisclaimerProps> = ({ wallet, onAccept, onDecline }) => {
  const [termsChecked, setTermsChecked] = useState(false);
  const [notInvestmentChecked, setNotInvestmentChecked] = useState(false);
  const [riskChecked, setRiskChecked] = useState(false);
  const [healthChecked, setHealthChecked] = useState(false);

  const allChecked = termsChecked && notInvestmentChecked && riskChecked && healthChecked;

  const handleAccept = () => {
    if (allChecked) {
      const acceptanceData = {
        timestamp: new Date().toISOString(),
        wallet: wallet || 'unknown',
        acceptedTerms: true
      };
      localStorage.setItem('fyts_disclaimer_accepted', JSON.stringify(acceptanceData));
      onAccept();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>
            FYTS Movement Validation Protocol
          </h2>
          <h3 style={{ margin: '0', color: '#7f8c8d', fontWeight: 'normal' }}>
            Terms of Use & Risk Disclosure
          </h3>
        </div>

        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '8px', 
          padding: '15px', 
          marginBottom: '20px' 
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
            IMPORTANT: READ CAREFULLY BEFORE PROCEEDING
          </h4>
          <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>
            By using this application, you acknowledge these terms are legally binding.
          </p>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '15px', cursor: 'pointer' }}>
            <input 
              type="checkbox"
              checked={termsChecked}
              onChange={(e) => setTermsChecked(e.target.checked)}
              style={{ marginRight: '10px', marginTop: '4px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold' }}>
              I have read and agree to the Terms of Service and Privacy Policy. I understand 
              this is a GPS activity tracking application that validates physical movement 
              for potential token rewards through a decentralized protocol.
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '15px', cursor: 'pointer' }}>
            <input 
              type="checkbox"
              checked={notInvestmentChecked}
              onChange={(e) => setNotInvestmentChecked(e.target.checked)}
              style={{ marginRight: '10px', marginTop: '4px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold' }}>
              I acknowledge that FYTS tokens are NOT an investment, NOT securities, and NOT 
              financial instruments. This Protocol makes NO representations about token value, 
              future performance, or returns. Any secondary market trading is independent of 
              this Protocol.
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '15px', cursor: 'pointer' }}>
            <input 
              type="checkbox"
              checked={riskChecked}
              onChange={(e) => setRiskChecked(e.target.checked)}
              style={{ marginRight: '10px', marginTop: '4px', cursor: 'pointer' }}
            />
            <span>
              I understand and accept ALL risks including: tokens may have zero value, total 
              loss of any value exchanged for tokens, Protocol may cease operation without 
              notice, validation requirements may change, smart contract risks, blockchain 
              network failures, and technical vulnerabilities may occur.
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '15px', cursor: 'pointer' }}>
            <input 
              type="checkbox"
              checked={healthChecked}
              onChange={(e) => setHealthChecked(e.target.checked)}
              style={{ marginRight: '10px', marginTop: '4px', cursor: 'pointer' }}
            />
            <span>
              I acknowledge the importance of consulting healthcare professionals before 
              beginning any exercise program. I take full responsibility for my health and 
              safety during physical activities. I will exercise within my limits, stay 
              hydrated, and seek medical attention if experiencing any adverse symptoms.
            </span>
          </label>
        </div>

        <div style={{ 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '8px', 
          padding: '15px', 
          marginBottom: '20px',
          fontSize: '12px',
          color: '#6c757d'
        }}>
          <p style={{ margin: '0 0 10px 0' }}>
            <strong>Legal Disclaimer:</strong> This Protocol operates under applicable laws. 
            Users are responsible for compliance with local regulations. The Protocol makes 
            no warranties and disclaims all liability to the fullest extent permitted by law.
          </p>
          <p style={{ margin: '0' }}>
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: '1px solid #dee2e6',
          paddingTop: '20px'
        }}>
          <button
            onClick={onDecline}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Decline
          </button>

          <div style={{ fontSize: '14px', color: allChecked ? '#28a745' : '#dc3545' }}>
            {allChecked ? 'Ready to continue' : 'Please check all boxes'}
          </div>

          <button
            onClick={handleAccept}
            disabled={!allChecked}
            style={{
              padding: '12px 24px',
              backgroundColor: allChecked ? '#28a745' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: allChecked ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              opacity: allChecked ? 1 : 0.6
            }}
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;