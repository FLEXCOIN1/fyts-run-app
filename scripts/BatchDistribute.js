const { ethers } = require('ethers');
const fs = require('fs');

// Network Validation Distribution Script
async function distributeValidationTokens() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);
  const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
  
  // Read validated movement data
  const csvData = fs.readFileSync('approved-runs.csv', 'utf8');
  const lines = csvData.split('\n').slice(1); // Skip header
  
  const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
  const contract = new ethers.Contract(process.env.TOKEN_ADDRESS, abi, wallet);
  
  for (const line of lines) {
    const [address, tokens] = line.split(',');
    if (address && tokens) {
      const amount = ethers.utils.parseEther(tokens);
      console.log(`Distributing ${tokens} FYTS to ${address} for network validation`);
      
      const tx = await contract.transfer(address, amount);
      await tx.wait();
      console.log(`Validation tokens distributed: ${tx.hash}`);
    }
  }
}