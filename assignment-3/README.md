# Assignment 3 – Web Interface + MetaMask

**Name:** Ashish Patil | **PRN:** 123B1B083 | **Subject:** Blockchain Laboratory

---

## 📌 Project Overview

This assignment demonstrates a **production-ready, full-stack decentralized application** — a competitive 1v1 DSA (Data Structures & Algorithms) quiz platform where developers stake cryptocurrency before a match and winners receive an automatic trustless payout.

The platform features:
- **Real-time 1v1 Matchmaking** using WebSocket-based state synchronization
- **Trustless Staking** via smart contracts on the Polygon testnet
- **Anti-Cheat System** with full-screen enforcement and tab-switch detection
- **NFT-based Achievement Badges** minted on Ethereum Sepolia
- **On-chain Governance (DAO)** gated by badge ownership

🔗 **Live Deployment:** [https://kodebatteb.vercel.app/](https://kodebatteb.vercel.app/)

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), Vanilla CSS, Framer Motion |
| **Backend / DB** | Supabase (PostgreSQL, Realtime, Auth) |
| **Blockchain** | Polygon Amoy (L2) + Ethereum Sepolia (L1) |
| **Web3 Library** | Ethers.js v6 |
| **Wallet Provider** | MetaMask (Injected Provider) |
| **Storage** | IPFS via Pinata |

---

## 🔗 How Frontend Connects to Blockchain

The frontend uses **Ethers.js** and the **MetaMask Browser Extension** as the wallet provider. There is no backend server involved in blockchain operations — all calls go directly to the Polygon RPC endpoint through MetaMask.

### Connection Flow:
```
Browser (Next.js App)
  └── Detects window.ethereum (MetaMask)
        └── new ethers.BrowserProvider(window.ethereum)
              └── provider.getSigner() → Returns signed wallet
                    └── new ethers.Contract(ADDRESS, ABI, signer)
                          └── contract.createMatch() / joinMatch() / resolveMatch()
```

### Key Integration Points:
1. **Wallet Detection:** On page load, the app checks if `window.ethereum` exists to detect MetaMask.
2. **Account Linking:** The user's MetaMask wallet address is stored in the Supabase user profile, linking their off-chain identity to their on-chain wallet.
3. **Match Staking:** When a match is found, the frontend calls `contract.createMatch(matchId, { value: ethers.parseEther(stake) })` to lock funds in the smart contract.
4. **Score Synchronization:** During the match, scores are synced every second via Supabase Realtime WebSocket channels — blockchain is NOT used for this to ensure speed.
5. **Payout Resolution:** When the match ends, the winner's browser calls `contract.resolveMatch(matchId, winnerAddress)` to atomically distribute the prize (90%) and fee (10%).

---

## 🦊 How MetaMask is Used

| Step | MetaMask Action |
|---|---|
| **1. Detect** | App checks `window.ethereum` on load |
| **2. Connect** | `eth_requestAccounts` triggers the MetaMask connect popup |
| **3. Sign Transactions** | `provider.getSigner()` — MetaMask holds and uses the private key |
| **4. Stake Funds** | MetaMask shows gas estimate + MATIC amount → user confirms |
| **5. Receive Payout** | Smart contract pushes ETH directly to wallet on win |

MetaMask is the **only** way funds move in this system — the application server has zero access to user funds at any point.

---

## 🔄 Full Match Lifecycle (Frontend ↔ Blockchain)

```
1. User clicks "Start Battle"
        ↓
2. Supabase: Query for waiting match with same stake
        ↓ (if found)
3. Supabase: Update match status → "matched"
        ↓
4. Both players enter VS screen
        ↓
5. Player 1 → MetaMask → contract.createMatch(id, { value: stake })
6. Player 2 waits → Polls on-chain until P1 tx confirmed
7. Player 2 → MetaMask → contract.joinMatch(id, { value: stake })
        ↓
8. Both p1_staked = true, p2_staked = true in Supabase
        ↓
9. 10-second countdown → Match starts (status: "playing")
        ↓
10. Players answer 10 DSA questions (scores synced via Supabase)
        ↓
11. Winner's browser calls contract.resolveMatch(id, winnerAddress)
        ↓
12. Smart Contract:
    - Sends 90% of pool → winner wallet (instant)
    - Sends 10% fee → platform wallet (instant)
        ↓
13. Match complete. ELO updated in Supabase.
```

---

## 🛡️ Anti-Cheat System (Frontend Logic)

The platform enforces fair play through browser-level monitoring:

```javascript
// Detects tab switches
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') triggerWarning();
});

// Detects fullscreen exits
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) triggerWarning();
});
```
- **3 warnings** = Automatic forfeit (score forced to 0)
- The forfeit is submitted to the smart contract, awarding the opponent the full prize

---
