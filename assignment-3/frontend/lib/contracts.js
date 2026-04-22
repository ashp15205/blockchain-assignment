import { ethers } from 'ethers';

// Deploy these contracts to Sepolia and paste addresses here
export const BATTLE_STAKING_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT;
export const BADGE_NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT;
export const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_CONTRACT;

export const BATTLE_STAKING_ABI = [
  "function createMatch(string matchId) payable",
  "function joinMatch(string matchId) payable",
  "function resolveMatch(string matchId, address winner)",
  "function getMatch(string matchId) view returns (address player1, address player2, uint256 stake, bool resolved, address winner)",
  "event MatchCreated(string matchId, address player1, uint256 stake)",
  "event MatchJoined(string matchId, address player2)",
  "event MatchResolved(string matchId, address winner, uint256 prize)"
];

export const BADGE_NFT_ABI = [
  "function mintBadge(address to, string uri) returns (uint256)",
  "function burnBadge(uint256 tokenId)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "event BadgeMinted(address to, uint256 tokenId)",
  "event BadgeBurned(uint256 tokenId)"
];

export const DAO_ABI = [
  "function createProposal(string _description)",
  "function vote(uint256 _proposalId, bool _support)",
  "function executeProposal(uint256 _proposalId)",
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256) view returns (string description, uint256 votesFor, uint256 votesAgainst, bool executed, bool exists)"
];

export function getProvider() {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
}

export async function getSigner() {
  const provider = getProvider();
  if (!provider) return null;
  return await provider.getSigner();
}

export async function getStakingContract(withSigner = false) {
  if (withSigner) {
    const signer = await getSigner();
    if (!signer) return null;
    return new ethers.Contract(BATTLE_STAKING_ADDRESS, BATTLE_STAKING_ABI, signer);
  }
  const provider = getProvider();
  if (!provider) return null;
  return new ethers.Contract(BATTLE_STAKING_ADDRESS, BATTLE_STAKING_ABI, provider);
}

export async function getNFTContract(withSigner = false) {
  if (withSigner) {
    const signer = await getSigner();
    if (!signer) return null;
    return new ethers.Contract(BADGE_NFT_ADDRESS, BADGE_NFT_ABI, signer);
  }
  const provider = getProvider();
  if (!provider) return null;
  return new ethers.Contract(BADGE_NFT_ADDRESS, BADGE_NFT_ABI, provider);
}

export async function getDAOContract(withSigner = false) {
  if (withSigner) {
    const signer = await getSigner();
    if (!signer) return null;
    return new ethers.Contract(DAO_ADDRESS, DAO_ABI, signer);
  }
  const provider = getProvider();
  if (!provider) return null;
  return new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);
}
