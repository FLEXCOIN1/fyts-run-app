import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface DisclaimerProps {
  onAccept: () => void;
  wallet: string;
}

const Disclaimer: React.FC<DisclaimerProps> = ({ onAccept, wallet }) => {
  const [termsChecked, setTermsChecked] = useState(false);
  const [utilityChecked, setUtilityChecked] = useState(false);
  const [riskChecked, setRiskChecked] = useState(false);
  const [notInvestmentChecked, setNotInvestmentChecked] = useState(false);
  const [healthChecked, setHealthChecked] = useState(false);

  const handleAccept = async () => {
    if (!termsChecked || !utilityChecked || !riskChecked || !notInvestmentChecked || !healthChecked) {
      return;
    }
    
    try {
      await addDoc(collection(db, 'legal_acceptances'), {
        wallet: wallet,
        acceptedAt: new Date().toISOString(),
        termsVersion: '1.0',
        ipAddress: window.location.hostname,
        userAgent: navigator.userAgent,
        acceptances: {
          termsOfService: termsChecked,
          utilityToken: utilityChecked,
          riskAcknowledgment: riskChecked,
          notInvestment: notInvestmentChecked,
          healthSafety: healthChecked
        }
      });
    } catch (error) {
      console.error('Error saving legal acceptance:', error);
    }
    
    localStorage.setItem(`fyts_terms_${wallet}`, JSON.stringify({
      accepted: true,
      date: new Date().toISOString(),
      version: '1.0'
    }));
    
    onAccept();
  };

  const allChecked = termsChecked && utilityChecked && riskChecked && notInvestmentChecked && healthChecked;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflowY: 'auto',
        width: '90%'
      }}>
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>
          FYTS Movement Validation Protocol
        </h2>
        <h3 style={{ textAlign: 'center', color: '#666' }}>
          Legal Acknowledgment & Risk Disclosure
        </h3>
        
        <div style={{ 
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f8d7da',
          borderRadius: '5px',
          border: '1px solid #f5c6cb'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>⚠️ CRITICAL NOTICE</h4>
          <p style={{ margin: '5px 0' }}>
            FYTS tokens are UTILITY tokens for network validation ONLY. While they may be 
            tradeable on decentralized exchanges, they are NOT an investment product. The 
            Protocol does NOT sell tokens and makes NO promises about token value.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '15px', cursor: 'pointer' }}>
            <input 
              type="checkbox"
              checked={termsChecked}
              onChange={(e) => setTermsChecked(e.target.checked)}
              style={{ marginRight: '10px', marginTop: '4px', cursor: 'pointer' }}
            />
            <span>
              I have read and accept the <Link to="/terms" target="_blank">Terms of Service</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>. 
              I understand this is a movement validation protocol for network integrity.
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '15px', cursor: 'pointer' }}>
            <input 
              type="checkbox"
              checked={utilityChecked}
              onChange={(e) => setUtilityChecked(e.target.checked)}
              style={{ marginRight: '10px', marginTop: '4px', cursor: 'pointer' }}
            />
            <span>
              I understand FYTS are UTILITY tokens distributed for network validation work. 
              They are earned through contributing movement data, NOT purchased from the Protocol.
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
              I acknowledge that FYTS tokens are NOT an investment, NOT securities, and the 
              Protocol makes NO representations about token value. Any trading is independent 
              of the Protocol.
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
              loss of any value exchanged for tokens in secondary markets, Protocol may cease 
              operation, validation requirements may change, and technical failures may occur.
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
              I ack