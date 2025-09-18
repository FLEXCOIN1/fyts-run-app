const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
require('dotenv').config();

// FYTS Movement Validation Token Distribution
// This script distributes tokens to validated movement contributors

const TOKEN_ADDRESS = '0x4058b5E8f569806C14D30eF5C7563a47D2248fb4';
const TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
];

async function distributeValidationTokens() {
  console.log('==========================================');
  console.log('FYTS Movement Validation Token Distribution');
  console.log('==========================================\n');

  // Check required environment variables
  if (!process.env.ADMIN_PRIVATE_KEY) {
    console.error('ERROR: ADMIN_PRIVATE_KEY not found in .env file');
    return;
  }

  try {
    // Connect to Polygon - FIXED FOR ETHERS V6
    console.log('Connecting to Polygon network...');
    const provider = new ethers.JsonRpcProvider(
      process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com'
    );
    
    // Get network info
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})\n`);

    // Setup wallet
    const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    console.log(`Admin wallet address: ${wallet.address}`);
    
    // Get POL balance for gas
    const balance = await provider.getBalance(wallet.address);
    console.log(`POL balance: ${ethers.formatEther(balance)} POL\n`);

    // Connect to token contract
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet);
    
    // Get token info
    const symbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();
    const tokenBalance = await tokenContract.balanceOf(wallet.address);
    console.log(`${symbol} balance: ${ethers.formatUnits(tokenBalance, decimals)} ${symbol}\n`);

    // Read CSV file
    const csvPath = path.join(__dirname, '../approvedvalidation.csv');
    
    // DEBUG OUTPUT
    console.log('DEBUG - CSV file path:', csvPath);
    console.log('DEBUG - CSV file exists:', fs.existsSync(csvPath));
    
    if (!fs.existsSync(csvPath)) {
      console.error('ERROR: approvedvalidation.csv not found');
      console.log('Make sure the CSV file is in your main project folder');
      return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    console.log('DEBUG - CSV content:', csvContent);
    console.log('DEBUG - CSV content length:', csvContent.length);
    console.log('DEBUG - CSV first 100 chars:', csvContent.substring(0, 100));

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log('DEBUG - Parsed records:', records);
    console.log('DEBUG - Number of records:', records.length);

    console.log(`Found ${records.length} validated movements to process\n`);

    // Create log file
    const logFileName = `distribution-log-${new Date().toISOString().split('T')[0]}.txt`;
    const logStream = fs.createWriteStream(path.join(__dirname, logFileName), { flags: 'a' });
    logStream.write(`FYTS Distribution Log - ${new Date().toISOString()}\n`);
    logStream.write('===========================================\n\n');

    // Process each distribution
    let successCount = 0;
    let failCount = 0;
    let totalDistributed = 0;

    for (const record of records) {
      const address = record.wallet || record.Wallet || record.address || record.Address;
      const tokens = record.tokens || record.Tokens || record.amount || record.Amount;

      console.log('DEBUG - Processing record:', record);
      console.log('DEBUG - Extracted address:', address);
      console.log('DEBUG - Extracted tokens:', tokens);

      if (!address || !tokens) {
        console.log(`⚠️  Skipping invalid record: ${JSON.stringify(record)}`);
        continue;
      }

      // Validate address
      if (!ethers.isAddress(address)) {
        console.log(`❌ Invalid address: ${address}`);
        failCount++;
        continue;
      }

      try {
        const amount = ethers.parseUnits(tokens.toString(), decimals);
        
        console.log(`Processing: ${address}`);
        console.log(`  Amount: ${tokens} ${symbol}`);
        
        // Send transaction
        const tx = await tokenContract.transfer(address, amount);
        console.log(`  TX Hash: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`  ✅ Confirmed in block ${receipt.blockNumber}`);
        
        // Log success
        successCount++;
        totalDistributed += parseFloat(tokens);
        
        const logEntry = `${new Date().toISOString()},${address},${tokens},${tx.hash},SUCCESS\n`;
        logStream.write(logEntry);
        
        // Save to processed file to prevent double distribution
        fs.appendFileSync(
          path.join(__dirname, 'processed-distributions.csv'),
          `${address},${tokens},${tx.hash},${new Date().toISOString()}\n`
        );
        
      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        failCount++;
        
        const logEntry = `${new Date().toISOString()},${address},${tokens},ERROR,${error.message}\n`;
        logStream.write(logEntry);
      }
      
      // Add small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log('\n==========================================');
    console.log('Distribution Complete');
    console.log('==========================================');
    console.log(`✅ Successful: ${successCount} distributions`);
    console.log(`❌ Failed: ${failCount} distributions`);
    console.log(`💰 Total Distributed: ${totalDistributed} ${symbol}`);
    console.log(`📄 Log saved to: ${logFileName}`);
    
    // Check remaining balance
    const finalBalance = await tokenContract.balanceOf(wallet.address);
    console.log(`\nRemaining ${symbol}: ${ethers.formatUnits(finalBalance, decimals)}`);
    
    logStream.end();
    
  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Safety check
console.log('⚠️  WARNING: This will distribute real tokens on Polygon mainnet');
console.log('Make sure your CSV is correct and you want to proceed.\n');

// Add 5 second delay for safety
console.log('Starting in 5 seconds... (Ctrl+C to cancel)\n');
setTimeout(() => {
  distributeValidationTokens().then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}, 5000);