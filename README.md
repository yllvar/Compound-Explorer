# Compound Interest Farming
## Overview
---
This project implements a Compound Interest Farming strategy using the Compound protocol. The script automates the process of depositing DAI into the cDAI market, claiming COMP rewards, and reinvesting those rewards back into the cDAI market to compound interest.

## Features
---
- Fetches user assets and interest rates from the Compound protocol.
- Approves token transfers for DAI and COMP.
- Deposits DAI into the cDAI market.
- Claims COMP rewards.
- Reinvests COMP rewards back into the cDAI market.
- Schedules reinvestment to run daily at midnight.

## Prerequisites

- Node.js and npm installed on your machine.
- An Ethereum wallet with some DAI and COMP tokens.
- An Infura project ID for connecting to the Ethereum mainnet.

## Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/yllvar/compound-interest-farming.git
   cd compound-interest-farming
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables:**
   - Create a `.env` file in the root directory of the project.
   - Add the following environment variables to the `.env` file:

     ```plaintext
     INFURA_PROJECT_ID=your_infura_project_id
     ACCOUNT_ADDRESS=your_wallet_address
     PRIVATE_KEY=your_private_key
     ```

   - Replace `your_infura_project_id`, `your_wallet_address`, and `your_private_key` with your actual Infura project ID, wallet address, and private key.

4. **Validate Private Key:**
   - Ensure that the private key is 64 hexadecimal characters (32 bytes), optionally starting with `0x`.

## Usage

1. **Run the Script:**
   ```bash
   node index.js
   ```

2. **Initial Setup:**
   - The script will:
     - Fetch user assets and interest rates.
     - Approve token transfer for DAI.
     - Deposit 100 DAI into the cDAI market.
     - Claim COMP rewards.
     - Reinvest COMP rewards back into the cDAI market.

3. **Scheduled Reinvestment:**
   - The script schedules reinvestment to run daily at midnight. You can modify the schedule in the `schedule.scheduleJob` function in `index.js`.

## Configuration

- **Change Deposit Amount:**
  - Modify the `amountToDeposit` variable in the `index.js` file to change the initial deposit amount.

  ```javascript
  const amountToDeposit = web3.utils.toWei('100', 'ether'); // Example: 100 DAI
  ```

- **Modify Reinvestment Schedule:**
  - Modify the cron expression in the `schedule.scheduleJob` function to change the reinvestment schedule.

  ```javascript
  schedule.scheduleJob('0 0 * * *', async () => { // Daily at midnight
    await reinvestInterest();
  });
  ```

