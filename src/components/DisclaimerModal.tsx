import React from 'react';

interface DisclaimerProps {
  onAccept: () => void;
}

const DisclaimerModal: React.FC<DisclaimerProps> = ({ onAccept }) => {
  return (
    <div style={{padding: '20px', maxWidth: '500px', margin: '0 auto'}}>
      <h2>Welcome to FYTS Run Tracker</h2>
      <div style={{border: '1px solid #ccc', padding: '15px', margin: '20px 0'}}>
        <h3>Disclaimer:</h3>
        <ul>
          <li>GPS activity tracking only</li>
          <li>Rewards in FYTS tokens (not an investment)</li>
          <li>Hydrate & don't overtrain</li>
        </ul>
      </div>
      <label>
        <input type="checkbox" id="terms" />
        I have read and agree to Terms & Conditions
      </label>
      <br/><br/>
      <button onClick={onAccept}>Continue</button>
    </div>
  );
};

export default DisclaimerModal;