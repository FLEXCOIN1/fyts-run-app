import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>FYTS Movement Validation Protocol - Terms of Service</h1>
      <p>Effective Date: {new Date().toLocaleDateString()}</p>

      <h2>1. ACCEPTANCE OF TERMS</h2>
      <p>
        By accessing or using the FYTS Movement Validation Protocol ("Protocol"), you agree to be bound by these Terms of Service. 
        If you do not agree to these terms, do not use the Protocol.
      </p>

      <h2>2. PROTOCOL DESCRIPTION</h2>
      <p>
        The FYTS Movement Validation Protocol is a decentralized network that validates movement data for network integrity purposes. 
        Participants contribute GPS movement data to help validate and secure the network. FYTS tokens are utility tokens used 
        solely within this validation system.
      </p>

      <h2>3. NOT A SECURITY OR INVESTMENT</h2>
      <p><strong>FYTS tokens are NOT:</strong></p>
      <ul>
        <li>Securities or investment contracts</li>
        <li>Guaranteed to appreciate in value</li>
        <li>Redeemable for fiat currency</li>
        <li>Dividend or profit-sharing instruments</li>
        <li>Backed by any physical assets</li>
        <li>Legal tender or currency</li>
      </ul>

      <h2>4. NETWORK PARTICIPATION</h2>
      <p>
        By participating in the network, you acknowledge that:
      </p>
      <ul>
        <li>You are contributing movement data for network validation purposes only</li>
        <li>Token distribution is based on valid movement data contribution</li>
        <li>The protocol may modify validation requirements at any time</li>
        <li>Your participation is voluntary and at your own risk</li>
      </ul>

      <h2>5. DATA COLLECTION AND PRIVACY</h2>
      <p>The Protocol collects:</p>
      <ul>
        <li>Distance traveled during movement sessions</li>
        <li>Duration of movement sessions</li>
        <li>Movement patterns for validation purposes</li>
        <li>Wallet addresses for token distribution</li>
        <li>Timestamp data for validation timing</li>
      </ul>
      <p>
        The Protocol does NOT collect or store specific GPS coordinates, personal health metrics, 
        or personally identifiable information beyond wallet addresses.
      </p>

      <h2>6. ASSUMPTION OF RISK</h2>
      <p>You acknowledge and agree that:</p>
      <ul>
        <li>Token value may be zero</li>
        <li>The network may cease operation at any time</li>
        <li>Validation criteria may change without notice</li>
        <li>No refunds or exchanges are available</li>
        <li>Technical errors may result in loss of data or tokens</li>
        <li>Physical activity carries inherent health risks</li>
      </ul>

      <h2>7. HEALTH AND SAFETY</h2>
      <p>
        You acknowledge that physical activity can be hazardous. You should consult with a physician before 
        participating in any exercise program. The Protocol is not responsible for any injuries or health 
        issues that may occur during movement data collection.
      </p>

      <h2>8. NO WARRANTY</h2>
      <p>
        THE PROTOCOL IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE 
        CONTINUOUS, UNINTERRUPTED, OR SECURE ACCESS TO THE PROTOCOL.
      </p>

      <h2>9. LIMITATION OF LIABILITY</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE PROTOCOL, ITS DEVELOPERS, OR AFFILIATES 
        BE LIABLE FOR ANY DAMAGES ARISING FROM YOUR USE OF THE PROTOCOL.
      </p>

      <h2>10. INDEMNIFICATION</h2>
      <p>
        You agree to indemnify and hold harmless the Protocol and its developers from any claims arising from 
        your use of the Protocol or violation of these terms.
      </p>

      <h2>11. GOVERNING LAW</h2>
      <p>
        These Terms shall be governed by the laws of [Your Jurisdiction], without regard to conflict of law principles.
      </p>

      <h2>12. CHANGES TO TERMS</h2>
      <p>
        We reserve the right to modify these Terms at any time. Continued use of the Protocol after changes 
        constitutes acceptance of modified terms.
      </p>

      <h2>13. CONTACT INFORMATION</h2>
      <p>
        For questions about these Terms, contact: [Your Contact Email]
      </p>
    </div>
  );
};

export default TermsOfService;