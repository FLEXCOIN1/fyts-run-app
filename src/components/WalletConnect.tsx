import { useState } from 'react';

const WalletConnectSimple: React.FC = () => {
  const [wallet, setWallet] = useState<string>('');

  const connectWallet = async () => {
    // Try MetaMask first
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setWallet(accounts[0]);
      } catch {
        // If MetaMask fails, manual entry
        const address = prompt('Enter your wallet address (0x...)');
        if (address) setWallet(address);
      }
    } else {
      // No wallet detected - manual entry
      const address = prompt('No wallet detected. Enter your address manually:');
      if (address) setWallet(address);
    }
  };

  return (
    <div>
      {!wallet ? (
        <button onClick={connectWallet}>Connect/Enter Wallet</button>
      ) : (
        <p>Wallet: {wallet.substring(0, 6)}...{wallet.substring(38)}</p>
      )}
    </div>
  );
};

export default WalletConnectSimple;