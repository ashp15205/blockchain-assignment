# Assignment 4 – IPFS Integration

**Name:** Ashish Patil | **PRN:** 123B1B083 | **Subject:** Blockchain Laboratory  

---

## 📌 Objective

Demonstrate **Decentralized Storage** using IPFS (InterPlanetary File System). In the KodeBattle platform, every DAO governance proposal is pinned to IPFS. The smart contract stores the **CID (Content Identifier)** hash — making the proposal immutable and tamper-proof.

---

## 🌐 Why IPFS?

| Problem (Database Storage) | Solution (IPFS) |
|---|---|
| Admin can edit proposal text after voting | CID is content-addressed — changing data changes the hash |
| Server goes down → proposals lost | Files are replicated across IPFS nodes globally |
| Users can't verify the original proposal | CID is the fingerprint — verifiable by anyone |

---

## 🛠️ Service Used

| Property | Value |
|---|---|
| **IPFS Service** | [Pinata Cloud](https://pinata.cloud) (IPFS Pinning Service) |
| **Method** | REST API (`pinJSONToIPFS`) |
| **Auth** | JWT (Bearer Token) |
| **Gateway** | `https://gateway.pinata.cloud/ipfs/<CID>` |

---

## ⚙️ Steps to Upload & Retrieve

### Step 1 – Sign Up on Pinata
1. Go to [https://pinata.cloud](https://pinata.cloud)
2. Create a free account
3. Go to **API Keys** → Create New Key (Admin permissions)
4. Copy the **JWT Token**

### Step 2 – Setup
```bash
cd assignment-4
npm init -y
npm install dotenv
```

Create a `.env` file:
```env
PINATA_JWT=your_pinata_jwt_token_here
```

### Step 3 – Run the Upload Script
```bash
node upload.js
```

Expected output:
```
===========================================
   KodeBattle – IPFS Upload (Pinata)
===========================================
✅ Upload Successful!
-------------------------------------------
CID (IPFS Hash)  : bafkreif5nx...
File Size        : 312 bytes
Timestamp        : 2026-04-19T00:00:00.000Z
-------------------------------------------
🔗 Gateway URL   : https://gateway.pinata.cloud/ipfs/bafkreif5nx...
===========================================
```

### Step 4 – Verify on IPFS Gateway
Open the Gateway URL in your browser to confirm the JSON is live.

---

## 📋 Sample IPFS Hash (CID)
```
CID: QmQUrQbCMHzNzwoxcrDTWSUDYHqJqYmSo7dX6rkVGNJkxL
Gateway URL: https://gateway.pinata.cloud/ipfs/QmQUrQbCMHzNzwoxcrDTWSUDYHqJqYmSo7dX6rkVGNJkxL
```

---

## 🔗 How Files are Stored & Retrieved

**Upload flow:**
```
upload.js → Pinata REST API → IPFS Network → Returns CID
```

**Retrieve flow:**
```
CID → IPFS Gateway URL → Any browser or node can fetch the JSON
```

**In the DAO Smart Contract:**
```solidity
// The CID is stored on-chain as proposal metadata
function createProposal(string memory ipfsHash, ...) external { ... }
```
This means the JSON content is on IPFS, and the **proof of what was voted on** is the immutable hash stored in the smart contract.

---


