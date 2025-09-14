import React, { useState, useEffect } from 'react';

const WalletConnect: React.FC = () => {
  const [wallet, setWallet] = useState<string>('');
  const [error, setError] = useState<string>('');

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setWallet(accounts[0]);
        setError('');
      } catch (error) {
        setError('Failed to connect. Open in MetaMask browser on mobile.');
      }
    } else {
      setError('No wallet found. Install MetaMask or use MetaMask browser.');
    }
  };

  return (
    <div>
      {!wallet ? (
        <>
          <button onClick={connectWallet}>Connect Wallet</button>
          {error && <p style={{color: 'red'}}>{error}</p>}
        </>
      ) : (
        <p>Connected: {wallet.substring(0, 6)}...{wallet.substring(38)}</p>
      )}
    </div>
  );
};

export default WalletConnect;