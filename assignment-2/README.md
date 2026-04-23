# Assignment 2 – Polygon Testnet Deployment

**Name:** Ashish Patil | **PRN:** 123B1B083 | **Subject:** Blockchain Laboratory

---

## 📌 Objective

Deploy the `Battle.sol` smart contract to the **Polygon Amoy Testnet** using **Remix IDE**. This demonstrates multi-chain deployment and the use of Layer-2 networks for cost-effective decentralized applications.

---

## 🌐 Network Details (Polygon Amoy Testnet)

| Property | Value |
|---|---|
| **Network Name** | Polygon Amoy Testnet |
| **Chain ID** | 80002 |
| **RPC URL** | `https://rpc-amoy.polygon.technology` |
| **Currency Symbol** | MATIC |
| **Block Explorer** | [https://amoy.polygonscan.com](https://amoy.polygonscan.com) |
| **Faucet** | [https://faucet.polygon.technology](https://faucet.polygon.technology) |

---

## 🚀 Steps to Deploy on Polygon Testnet

### Step 1 – Open Remix IDE
- Go to [https://remix.ethereum.org](https://remix.ethereum.org)
- Create a new file named `Battle.sol` and paste the contract code

### Step 2 – Compile Contract
- Click the **Solidity Compiler** tab
- Select version `0.8.20`
- Click **Compile Battle.sol**
- ✅ Green checkmark confirms compilation success

### Step 3 – Setup MetaMask for Polygon Amoy
- Open MetaMask → Click Network Selector → Add Network Manually
- Fill in the network details from the table above
- Get free test MATIC from the [Polygon Faucet](https://faucet.polygon.technology)

### Step 4 – Connect MetaMask to Remix
- Go to **Deploy & Run Transactions** tab
- Set **Environment** → `Injected Provider - MetaMask`
- MetaMask will ask for connection confirmation → Click **Connect**

### Step 5 – Deploy Contract
- In the constructor input box, type `"Genesis Battle"`
- Click **Deploy**
- Confirm the transaction in MetaMask
- ✅ Contract address appears in the "Deployed Contracts" section

### Step 6 – Verify on Explorer
- Copy the deployed contract address
- Open [https://amoy.polygonscan.com](https://amoy.polygonscan.com)
- Paste the address to view the live transaction details

---

## ✅ Deployed Contract Info

```
Contract Address : 0x383428cE9418E6B444c80A966dab4B317DA376De
Network          : Polygon Amoy Testnet
Transaction Hash: 0xe2beec57bac3692d77683a44574b39b57eb76ac73070f497758527dd151efc02
Explorer URL     : https://amoy.polygonscan.com/address/0x383428cE9418E6B444c80A966dab4B317DA376De
```

---

