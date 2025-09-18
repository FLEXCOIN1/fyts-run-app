import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/')}
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        ← Back to App
      </button>
      
      <h1>FYTS Movement Validation Protocol - Privacy Policy</h1>
      <p>Last Updated: January 1, 2025</p>

      <h2>1. INTRODUCTION</h2>
      <p>
        This Privacy Policy explains how the FYTS Movement Validation Protocol ("we", "our", "Protocol") 
        collects, uses, and protects your information when you use our movement validation service. 
        By using the Protocol, you consent to the data practices described in this policy.
      </p>

      <h2>2. INFORMATION WE COLLECT</h2>
      
      <h3>A. Movement Validation Data</h3>
      <p>When you participate in movement validation, we collect:</p>
      <ul>
        <li>Total distance traveled (in miles or kilometers)</li>
        <li>Duration of movement sessions</li>
        <li>Number of valid movement data points</li>
        <li>Movement velocity for validation purposes</li>
        <li>GPS accuracy metrics (but NOT specific coordinates)</li>
        <li>Timestamps of validation sessions</li>
      </ul>

      <h3>B. Blockchain Data</h3>
      <ul>
        <li>Polygon wallet addresses (public)</li>
        <li>Transaction hashes for token distribution</li>
        <li>Token balance and distribution history</li>
      </ul>

      <h3>C. Technical Data</h3>
      <ul>
        <li>Device type (mobile/desktop)</li>
        <li>Browser type and version</li>
        <li>IP address (for security and fraud prevention)</li>
        <li>Session identifiers</li>
      </ul>

      <h2>3. INFORMATION WE DO NOT COLLECT</h2>
      <p>We specifically do NOT collect or store:</p>
      <ul>
        <li>Specific GPS coordinates or location history</li>
        <li>Personal health or fitness data</li>
        <li>Names or government-issued identifiers</li>
        <li>Email addresses (unless voluntarily provided for support)</li>
        <li>Phone numbers</li>
        <li>Payment card information</li>
        <li>Biometric data</li>
      </ul>

      <h2>4. HOW WE USE YOUR INFORMATION</h2>
      <p>We use collected information exclusively for:</p>
      <ul>
        <li>Validating movement data for network integrity</li>
        <li>Distributing FYTS utility tokens to validators</li>
        <li>Preventing fraudulent validation attempts</li>
        <li>Improving Protocol efficiency and accuracy</li>
        <li>Generating aggregate network statistics</li>
        <li>Complying with legal obligations</li>
      </ul>

      <h2>5. DATA SHARING AND DISCLOSURE</h2>
      <p>We do NOT sell, rent, or trade your personal information. We may share data only:</p>
      <ul>
        <li>With your consent</li>
        <li>To comply with legal obligations or court orders</li>
        <li>To protect against fraud or security threats</li>
        <li>In aggregate, anonymized form for network statistics</li>
        <li>On the public blockchain (wallet addresses and transactions only)</li>
      </ul>

      <h2>6. DATA STORAGE AND SECURITY</h2>
      <ul>
        <li>Movement validation data is stored on secured Firebase servers</li>
        <li>We use industry-standard encryption for data transmission</li>
        <li>Access is restricted to authorized personnel only</li>
        <li>We regularly review and update security measures</li>
        <li>Blockchain data is publicly visible and immutable</li>
      </ul>
      <p>
        Despite our efforts, no system is 100% secure. We cannot guarantee absolute security of your data.
      </p>

      <h2>7. DATA RETENTION</h2>
      <ul>
        <li>Movement validation data: Retained for 1 year for validation history</li>
        <li>Technical logs: Retained for 90 days</li>
        <li>Blockchain data: Permanent and immutable</li>
        <li>You may request deletion of non-blockchain data at any time</li>
      </ul>

      <h2>8. YOUR RIGHTS AND CHOICES</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access your movement validation data</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your data (except blockchain records)</li>
        <li>Opt-out by discontinuing use of the Protocol</li>
        <li>Export your validation history</li>
      </ul>
      <p>
        To exercise these rights, contact us at [Your Contact Email].
      </p>

      <h2>9. COOKIES AND TRACKING</h2>
      <ul>
        <li>We use essential cookies for session management only</li>
        <li>No third-party advertising or tracking cookies</li>
        <li>No cross-site tracking</li>
        <li>You can disable cookies in your browser (may affect functionality)</li>
      </ul>

      <h2>10. CHILDREN'S PRIVACY</h2>
      <p>
        The Protocol is not intended for users under 18 years of age. We do not knowingly collect 
        data from minors. If we learn we have collected information from a minor, we will delete it.
      </p>

      <h2>11. INTERNATIONAL DATA TRANSFERS</h2>
      <p>
        Your data may be processed in countries outside your residence. By using the Protocol, 
        you consent to such transfers. We ensure appropriate safeguards are in place.
      </p>

      <h2>12. CALIFORNIA PRIVACY RIGHTS</h2>
      <p>
        California residents have additional rights under CCPA including the right to know what 
        personal information is collected, request deletion, and opt-out of any sale of personal 
        information (we do not sell personal information).
      </p>

      <h2>13. CHANGES TO THIS POLICY</h2>
      <p>
        We may update this Privacy Policy periodically. Material changes will be notified through 
        the Protocol interface. Continued use after changes constitutes acceptance.
      </p>

      <h2>14. CONTACT INFORMATION</h2>
      <p>
        For privacy-related questions or concerns:<br/>
        Email: [Your Contact Email]<br/>
        Response time: Within 30 days
      </p>

      <h2>15. DATA PROTECTION OFFICER</h2>
      <p>
        [If applicable, add DPO contact information]
      </p>
    </div>
  );
};

export default PrivacyPolicy;