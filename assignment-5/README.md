# Assignment 5 – DAO Smart Contract

**Name:** Ashish Patil | **PRN:** 123B1B083 | **Subject:** Blockchain Laboratory

---

## 📌 Objective

Implement a **Decentralized Autonomous Organization (DAO)** smart contract that governs a decentralized protocol. The DAO allows registered members to create proposals and vote on platform changes — all enforced by Solidity code on-chain, not by any central authority.

---

## 🗳️ Voting Mechanism

| Property | Value |
|---|---|
| **Voting Power** | 1 address = 1 vote (equal voting rights) |
| **Membership Gate** | Must be added by admin (or NFT holder in extended version) |
| **Vote Options** | `true` = FOR, `false` = AGAINST |
| **Pass Condition** | `votesFor > votesAgainst` |
| **Double-Vote Prevention** | `hasVoted[proposalId][voter]` mapping — reverts if already voted |
| **Execution Guard** | Proposal must pass before it can be executed |

---

## 📋 Proposal Creation Flow

1. Admin calls `addMember(address)` to register a voter.
2. Any registered member calls `createProposal("description")`.
3. The proposal is stored on-chain with `votesFor = 0`, `votesAgainst = 0`, `executed = false`.
4. Members call `vote(proposalId, true/false)` to cast their vote.
5. Once voting is done, any member calls `executeProposal(proposalId)`.
6. The contract checks if `votesFor > votesAgainst` → emits `ProposalExecuted`.

---

## ⚙️ Key Functions

| Function | Who Can Call | Description |
|---|---|---|
| `addMember(address)` | Admin only | Registers an address as a DAO member |
| `createProposal(description)` | Members only | Creates a new on-chain proposal |
| `vote(proposalId, support)` | Members only | Casts a FOR (true) or AGAINST (false) vote |
| `executeProposal(proposalId)` | Members only | Finalizes proposal if votes pass |
| `getProposal(id)` | Anyone | Returns full proposal details |

---

## 🔄 DAO Workflow

```
[Admin]
    │
    └── addMember(0xAddress1)
    └── addMember(0xAddress2)
    └── addMember(0xAddress3)
            │
            ▼
[Member: 0xAddress1]
    └── createProposal("Reduce platform fee to 8%")
            │
            ▼
[Voting Opens]
    ├── 0xAddress1.vote(1, true)   ← FOR
    ├── 0xAddress2.vote(1, false)  ← AGAINST
    └── 0xAddress3.vote(1, true)   ← FOR
            │
            ▼
[Any Member calls executeProposal(1)]
    └── votesFor (2) > votesAgainst (1) → ✅ EXECUTED
            │
            ▼
[Event: ProposalExecuted(id: 1) emitted on-chain]
```

---

## 🛠️ Deployment Steps (Remix IDE)

### Step 1 – Open Remix
Go to [https://remix.ethereum.org](https://remix.ethereum.org)

### Step 2 – Create & Compile
- Create a new file `SimpleDAO.sol` and paste the contract code
- Go to **Solidity Compiler** tab → Select `0.8.20` → Click **Compile**

### Step 3 – Deploy
- Go to **Deploy & Run Transactions** tab
- Environment: `Remix VM (Cancun)` for local testing OR `Injected Provider - MetaMask` for Sepolia/Amoy
- Click **Deploy** (no constructor arguments needed)

### Step 4 – Test Full Flow in Remix
```
// In order, using Remix's deployed contract panel:

1. [Account 1 - Admin] addMember("0xAddress2")
2. [Account 1 - Admin] addMember("0xAddress3")
3. [Account 1] createProposal("Reduce fee to 8%")
4. [Account 2] vote(1, true)   ← Switch account in MetaMask/Remix
5. [Account 3] vote(1, true)   ← Switch account in MetaMask/Remix
6. [Account 1] vote(1, false)
7. [Account 1] executeProposal(1)  ← votesFor=2 wins
8. [Anyone]    getProposal(1)  ← Verify executed = true
```

---

## 📸 Screenshots
*(Attach screenshots of: Contract deployed in Remix, addMember transaction, createProposal transaction, vote transactions from multiple accounts, executeProposal with result showing executed = true)*
