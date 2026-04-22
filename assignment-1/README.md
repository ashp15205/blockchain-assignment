# Assignment 1 – Smart Contract Development

**Name:** Ashish Patil | **PRN:** 123B1B083 | **Subject:** Blockchain Laboratory

---

## 📌 Contract Purpose

`contract.sol` is a **trustless 1v1 wager smart contract**. It solves the "Centralized Custodian" problem in competitive gaming — instead of depositing money with a platform administrator, both players lock funds directly into code (the smart contract). No human can access or manipulate the funds.

**Core Idea:** Two players stake ETH. The winner automatically gets 90% of the total pool. The platform collects a 10% fee. No human intervention is required at any stage.

---

## ⚙️ Key Functions & Logic

| Function | Visibility | Description |
|---|---|---|
| `createMatch(matchId)` | `external payable` | Player 1 creates a match and stakes ETH |
| `joinMatch(matchId)` | `external payable` | Player 2 joins and must match the exact stake |
| `resolveMatch(matchId, winner)` | `external` | Distributes prize (90%) and fee (10%) atomically |
| `cancelMatch(matchId)` | `external` | Player 1 cancels and gets full refund if no one joined |
| `setPlatformFee(fee)` | `external onlyOwner` | Owner can change fee (max 20%) |
| `getMatch(matchId)` | `view` | Returns Player 1 address and existence flag |

### Payout Formula
```
Total Pool     = stake × 2
Platform Fee   = Total Pool × 10%
Winner Prize   = Total Pool − Fee  (= 1.8x the individual stake)
```

### Security Patterns Used
- **Checks-Effects-Interactions (CEI):** State is updated *before* external `.call{}` to prevent reentrancy attacks.
- **`onlyOwner` modifier:** Restricts admin-level functions to the contract deployer.
- **`require` guards:** Every function validates inputs before execution.

---

## 🛠️ Compilation & Deployment Steps (Remix IDE)

### Step 1 – Open Remix
Go to [https://remix.ethereum.org](https://remix.ethereum.org)

### Step 2 – Create the File
- In the File Explorer panel, click ➕ New File
- Name it `contract.sol`
- Paste the contents of the smart contract

### Step 3 – Compile
- Click the **Solidity Compiler** tab (left sidebar)
- Select Compiler version: `0.8.20`
- Click **"Compile contract.sol"**
- ✅ You should see a green checkmark confirming success

### Step 4 – Deploy (Local VM)
- Click the **Deploy & Run Transactions** tab
- Set Environment: `Remix VM (Cancun)` for local testing
- Click **"Deploy"**
- ✅ The contract appears in "Deployed Contracts" section below

### Step 5 – Test Functions
In the deployed contract panel:
1. Set value to `1 ether` → Call `createMatch("match_001")`
2. Switch to Account 2 → Set value to `1 ether` → Call `joinMatch("match_001")`
3. Call `resolveMatch("match_001", <Account1_address>)`
4. Verify Account 1 received `1.8 ETH` and Owner received `0.2 ETH`

---

## 📸 Screenshots
*(Attach screenshots of: Compilation success, Contract deployment, createMatch transaction, resolveMatch with balance change)*
