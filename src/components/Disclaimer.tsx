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
    if (allChecked && wallet) {
      const acceptanceData = {
        timestamp: new Date().toISOString(),
        wallet: wallet,
        acceptedTerms: true,
        userAgent: navigator.userAgent
      };
      // Use the same key format that App.tsx checks for
      localStorage.setItem(`fyts_terms_${wallet}`, JSON.stringify(acceptanceData));
      onAccept();
    }
  };

  const handleDecline = () => {
    // Clear any existing acceptance
    if (wallet) {
      localStorage.removeItem(`fyts_terms_${wallet}`);
    }
    onDecline();
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
            Terms of Use & Legal Disclaimers
          </h3>
          {wallet && (
            <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#666' }}>
              Wallet: {wallet.substring(0, 8)}...{wallet.substring(wallet.length - 6)}
            </p>
          )}
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
            If you do not agree to all terms, do not use this application.
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
              this is a GPS movement tracking application that validates physical activity 
              for potential token rewards through a decentralized validation protocol.
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
              future performance, or returns. Any secondary market trading is completely 
              independent of this Protocol and not endorsed.
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
              loss of any value, Protocol may cease operation without notice, validation 
              requirements may change at any time, smart contract vulnerabilities, blockchain 
              network failures, technical bugs, and complete loss of access to tokens.
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
              beginning any exercise program. I take full responsibility for my health, 
              safety, and physical limitations during all activities. I will exercise 
              within my capabilities, stay properly hydrated, and seek immediate medical 
              attention for any adverse symptoms or injuries.
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
            <strong>Legal Notice:</strong> This Protocol operates as a technology demonstration. 
            Users are solely responsible for compliance with applicable laws and regulations 
            in their jurisdiction. The Protocol makes no warranties and disclaims all 
            liability to the fullest extent permitted by law.
          </p>
          <p style={{ margin: '0 0 10px 0' }}>
            <strong>Data Usage:</strong> GPS location data is processed solely for distance 
            validation and is not stored permanently. Movement patterns are not tracked 
            beyond validation requirements.
          </p>
          <p style={{ margin: '0' }}>
            <strong>No Guarantees:</strong> No tokens are guaranteed for any activity. 
            All validation is subject to technical requirements, admin review, and Protocol 
            operation status. Terms may be updated at any time.
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
            onClick={handleDecline}
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
            Decline & Exit
          </button>

          <div style={{ fontSize: '14px', color: allChecked ? '#28a745' : '#dc3545' }}>
            {allChecked ? 'Ready to proceed' : 'Please check all boxes to continue'}
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