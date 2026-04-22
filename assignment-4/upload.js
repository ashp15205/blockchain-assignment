/**
 * upload.js – IPFS Integration via Pinata
 * Assignment 4: IPFS Integration
 * Author: Ashish Patil (PRN: 123B1B083)
 *
 * This script demonstrates:
 *  1. Uploading a JSON proposal (DAO metadata) to IPFS via Pinata API
 *  2. Retrieving the CID (Content Identifier) hash
 *  3. Verifying the pinned file via the public IPFS/Pinata gateway
 *
 * Run: node upload.js
 * Requires: PINATA_JWT set in .env file
 */

require("dotenv").config();

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const PINATA_API    = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PINATA_JWT    = process.env.PINATA_JWT;
const GATEWAY       = "https://gateway.pinata.cloud/ipfs";

// ─── SAMPLE DAO PROPOSAL PAYLOAD ─────────────────────────────────────────────
// This represents the metadata for a governance proposal
// that would be stored immutably on IPFS and referenced by the DAO contract.

const proposalData = {
  title:        "Reduce Platform Fee from 10% to 8%",
  description:  "This proposal suggests reducing the platform staking fee " +
                "from 10% to 8% to attract more competitive players. " +
                "The reduced fee will be effective from the next protocol cycle.",
  type:         "Governance",
  creator:      "Ashish Patil",
  prn:          "123B1B083",
  created_at:   new Date().toISOString(),
  version:      "1.0.0"
};

// ─── UPLOAD FUNCTION ─────────────────────────────────────────────────────────

async function uploadToIPFS(data) {
  console.log("===========================================");
  console.log("   KodeBattle – IPFS Upload (Pinata)     ");
  console.log("===========================================");
  console.log("Payload to pin:");
  console.log(JSON.stringify(data, null, 2));
  console.log("-------------------------------------------");

  if (!PINATA_JWT) {
    console.error("❌ ERROR: PINATA_JWT not found in .env file.");
    console.log("Create a .env file with: PINATA_JWT=your_jwt_here");
    process.exit(1);
  }

  try {
    const response = await fetch(PINATA_API, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PINATA_JWT}`
      },
      body: JSON.stringify({
        pinataContent:  data,
        pinataMetadata: {
          name: `KodeBattle_DAO_Proposal_${Date.now()}`
        },
        pinataOptions: {
          cidVersion: 1  // Use CIDv1 for broader compatibility
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Pinata API error ${response.status}: ${errBody}`);
    }

    const result = await response.json();

    console.log("✅ Upload Successful!");
    console.log("-------------------------------------------");
    console.log("CID (IPFS Hash)  :", result.IpfsHash);
    console.log("File Size        :", result.PinSize, "bytes");
    console.log("Timestamp        :", result.Timestamp);
    console.log("-------------------------------------------");
    console.log("🔗 Gateway URL   :", `${GATEWAY}/${result.IpfsHash}`);
    console.log("===========================================");
    console.log("Use this CID in your DAO smart contract:");
    console.log(`createProposal("${result.IpfsHash}")`);
    console.log("===========================================");

    return result.IpfsHash;

  } catch (err) {
    console.error("❌ Upload Failed:", err.message);
    process.exit(1);
  }
}

// ─── RETRIEVE FUNCTION ────────────────────────────────────────────────────────

async function retrieveFromIPFS(cid) {
  console.log(`\nFetching data from IPFS: ${cid}...`);
  try {
    const response = await fetch(`${GATEWAY}/${cid}`);
    const data     = await response.json();
    console.log("✅ Data Retrieved Successfully:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Retrieval Failed:", err.message);
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  // Step 1: Upload the proposal to IPFS
  const cid = await uploadToIPFS(proposalData);

  // Step 2: Wait briefly and retrieve to verify
  console.log("\nWaiting 3 seconds before retrieval verification...");
  await new Promise(r => setTimeout(r, 3000));

  // Step 3: Retrieve and confirm
  await retrieveFromIPFS(cid);
}

main();
