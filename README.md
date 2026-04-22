# 🔗 Blockchain Laboratory – Assignments

**Name:** Ashish Patil
**PRN:** 123B1B083
**Subject:** Blockchain Laboratory
**Division:** B (BT-1) | **Academic Year:** 2025–26

---

## 🌐 Live Project

> This repository contains all 5 Blockchain Laboratory assignments, each building a distinct layer of a **production-deployed decentralized application**.

🚀 **Live Platform:** [https://kodebatteb.vercel.app/](https://kodebatteb.vercel.app/)

The live platform is a full-featured **decentralized 1v1 DSA quiz protocol** where developers compete in real-time matches with real cryptocurrency stakes. The application demonstrates every major concept covered in the course — from basic Solidity contracts to IPFS storage and DAO governance — in a single, coherent, production-grade system.

---

## 📋 Assignment Overview

Each assignment progressively builds upon the previous, forming a complete multi-layered decentralized system:

| # | Assignment | Core Concept | Technology | Status |
|---|---|---|---|---|
| 1 | Smart Contract Development | Solidity, Escrow Logic | Remix IDE, EVM | ✅ Done |
| 2 | Polygon Testnet Deployment | Multi-Chain, L2 Networks | Polygon Amoy, MetaMask | ✅ Done |
| 3 | Web Interface + MetaMask | Frontend ↔ Blockchain | Next.js, Ethers.js | ✅ Done |
| 4 | IPFS Integration | Decentralized Storage | Pinata, CID | ✅ Done |
| 5 | DAO Smart Contract | Governance, Voting | Solidity, Remix IDE | ✅ Done |

---


---

## 🛠️ Full Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity v0.8.20, OpenZeppelin |
| Development | Remix IDE, Hardhat |
| Frontend | Next.js 15 (App Router), Vanilla CSS |
| Wallet Integration | MetaMask, Ethers.js v6 |
| Testnet (L2) | Polygon Amoy (Chain ID: 80002) |
| Testnet (L1) | Ethereum Sepolia |
| Decentralized Storage | IPFS via Pinata (JWT Auth) |
| Database / Realtime | Supabase (PostgreSQL + WebSockets) |
| Deployment | Vercel |

---

## 📁 Repository Structure

```
blockchain-lab-assignments/
├── README.md                        ← You are here
├── assignment-1/
│   ├── contract.sol                 ← BattleStaking smart contract
│   ├── screenshots/
│   └── README.md
├── assignment-2/
│   ├── contracts/
│   │   └── Battle.sol              ← Contract deployed to Polygon Amoy
│   ├── scripts/
│   │   └── deploy.js
│   ├── hardhat.config.js
│   ├── screenshots/
│   └── README.md
├── assignment-3/
│   ├── screenshots/
│   └── README.md                   ← Full DApp documentation
├── assignment-4/
│   ├── upload.js                   ← Pinata IPFS upload script
│   ├── screenshots/
│   └── README.md
└── assignment-5/
    ├── KodeBattleDAO.sol           ← Standalone DAO contract
    ├── screenshots/
    └── README.md
```

---


## 🔑 Environment Setup

Each assignment that requires API keys needs the following in a `.env` file:

```env
# Supabase (Assignment 3)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Blockchain Contracts (Assignment 3)
NEXT_PUBLIC_STAKING_CONTRACT=0x...
NEXT_PUBLIC_NFT_CONTRACT=0x...
NEXT_PUBLIC_DAO_CONTRACT=0x...

# IPFS (Assignment 4)
PINATA_JWT=your_pinata_jwt_token

# Deployment (Assignment 2)
PRIVATE_KEY=your_wallet_private_key
```

> ⚠️ Never commit `.env` files to GitHub. All `.env` files are listed in `.gitignore`.

---
