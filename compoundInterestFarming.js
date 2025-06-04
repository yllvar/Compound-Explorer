const Web3 = require('web3');
const schedule = require('node-schedule');

// Load environment variables
require('dotenv').config();

// Validate required environment variables
if (!process.env.INFURA_PROJECT_ID || !process.env.ACCOUNT_ADDRESS || !process.env.PRIVATE_KEY) {
  console.error('Missing required environment variables. Please check your .env file');
  process.exit(1);
}

// Validate private key format (64 hex characters, optionally starting with 0x)
const privateKey = process.env.PRIVATE_KEY;
if (!/^(0x)?[0-9a-fA-F]{64}$/.test(privateKey)) {
  console.error('Invalid private key format. It must be 64 hexadecimal characters (32 bytes)');
  process.exit(1);
}

const web3 = new Web3(`https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
const accountAddress = process.env.ACCOUNT_ADDRESS;
// privateKey is already defined above

// Contract Addresses (all in checksum format)
const compoundComptrollerAddress = '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B';
const cDAIAddress = '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643'; // cDAI address
const DAIAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // DAI address
const COMPAddress = '0xc00e94Cb662C07889123658ff3BC9de462497c29'; // COMP token address (official checksum format)

// ABI Definitions
const comptrollerABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "getAllMarkets",
    "outputs": [{ "name": "", "type": "address[]" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "getAssetsIn",
    "outputs": [{ "name": "", "type": "address[]" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{ "name": "cTokens", "type": "address[]" }],
    "name": "enterMarkets",
    "outputs": [{ "name": "", "type": "uint256[]" }],
    "type": "function"
  }
];

const cTokenABI = [
  {
    "constant": false,
    "inputs": [{ "name": "mintAmount", "type": "uint256" }],
    "name": "mint",
    "outputs": [{ "name": "", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{ "name": "redeemTokens", "type": "uint256" }],
    "name": "redeem",
    "outputs": [{ "name": "", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "exchangeRateCurrent",
    "outputs": [{ "name": "", "type": "uint256" }],
    "type": "function"
  }
];

const erc20ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{ "name": "", "type": "string" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "_to", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "name": "", "type": "string" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  }
];

// Contract Instances (converted to checksum addresses)
const comptrollerContract = new web3.eth.Contract(comptrollerABI, web3.utils.toChecksumAddress(compoundComptrollerAddress));
const cDAIContract = new web3.eth.Contract(cTokenABI, web3.utils.toChecksumAddress(cDAIAddress));
const DAITokenContract = new web3.eth.Contract(erc20ABI, web3.utils.toChecksumAddress(DAIAddress));
const COMPTokenContract = new web3.eth.Contract(erc20ABI, web3.utils.toChecksumAddress(COMPAddress));

// Signer Setup
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

async function getUserAssetsAndInterestRates() {
  try {
    const assetsIn = await comptrollerContract.methods.getAssetsIn(accountAddress).call();
    const interestRates = {};

    for (const asset of assetsIn) {
      const cTokenContract = new web3.eth.Contract(cTokenABI, asset);
      const supplyRatePerBlock = await cTokenContract.methods.supplyRatePerBlock().call();
      const interestRate = supplyRatePerBlock / 1e18 * 100 * 2102400; // Convert to APY (approximation)
      interestRates[asset] = interestRate;
    }

    console.log('User Assets and Interest Rates:', interestRates);
    return interestRates;
  } catch (error) {
    console.error('Error fetching user assets and interest rates:', error);
  }
}

async function approveTokenTransfer(tokenContract, spenderAddress, amount) {
  try {
    const tx = await tokenContract.methods.approve(spenderAddress, amount).send({ from: accountAddress });
    console.log('Token transfer approved:', tx.transactionHash);
  } catch (error) {
    console.error('Error approving token transfer:', error);
  }
}

async function depositTokens(cTokenContract, amount) {
  try {
    const tx = await cTokenContract.methods.mint(amount).send({ from: accountAddress });
    console.log('Tokens deposited:', tx.transactionHash);
  } catch (error) {
    console.error('Error depositing tokens:', error);
  }
}

async function claimRewards() {
  try {
    const tx = await comptrollerContract.methods.claimComp(accountAddress).send({ from: accountAddress });
    console.log('Rewards claimed:', tx.transactionHash);
  } catch (error) {
    console.error('Error claiming rewards:', error);
  }
}

async function reinvestInterest() {
  try {
    // Claim rewards
    await claimRewards();

    // Get COMP balance
    const compBalance = await COMPTokenContract.methods.balanceOf(accountAddress).call();

    if (compBalance === '0') {
      console.log('No COMP rewards to reinvest.');
      return;
    }

    // Approve COMP transfer
    await approveTokenTransfer(COMPTokenContract, cDAIAddress, compBalance);

    // Deposit COMP to cDAI
    await depositTokens(cDAIContract, compBalance);

    console.log('Interest reinvested successfully.');
  } catch (error) {
    console.error('Error reinvesting interest:', error);
  }
}

// Schedule reinvestment every day at midnight
schedule.scheduleJob('0 0 * * *', async () => {
  await reinvestInterest();
});

// Initial setup
(async () => {
  // Fetch user assets and interest rates
  await getUserAssetsAndInterestRates();

  // Approve token transfer
  const amountToDeposit = web3.utils.toWei('100', 'ether'); // Example: 100 DAI
  await approveTokenTransfer(DAITokenContract, cDAIAddress, amountToDeposit);

  // Deposit tokens
  await depositTokens(cDAIContract, amountToDeposit);

  // Initial reinvestment
  await reinvestInterest();
})();
