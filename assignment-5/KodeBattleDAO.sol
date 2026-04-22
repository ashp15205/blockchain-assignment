// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title KodeBattleDAO
 * @author Ashish Patil (PRN: 123B1B083)
 * @notice Assignment 5 – Decentralized Autonomous Organization (DAO) Smart Contract
 *
 * @dev This DAO governs the KodeBattle protocol parameters.
 *
 *      WORKFLOW:
 *      ─────────
 *      1. PROPOSAL  → A member with a BadgeNFT creates a proposal (pinned to IPFS).
 *      2. VOTING    → Any address can vote FOR or AGAINST (1 address = 1 vote).
 *      3. EXECUTION → After the voting period (3 days), owner can execute if quorum met.
 *
 *      GATING:
 *      ───────
 *      - createProposal() requires msg.sender to hold a BadgeNFT (ERC-721).
 *      - Voting is open to all (permissionless, but tracked to prevent double-voting).
 *
 *      KEY CONCEPTS DEMONSTRATED:
 *      ──────────────────────────
 *      - Governance by smart contract (no admin password needed)
 *      - IPFS metadata for immutable proposal documentation
 *      - On-chain vote tallying with quorum threshold
 *      - Time-locked execution window
 */

// Minimal ERC-721 interface — only balanceOf is needed for gating
interface IERC721 {
    function balanceOf(address owner) external view returns (uint256);
}

contract KodeBattleDAO {

    // ─────────────────────────── State Variables ───────────────────────────

    /// @notice Contract owner (can execute passed proposals)
    address public owner;

    /// @notice Address of the BadgeNFT contract used for proposal gating
    address public badgeNFTAddress;

    /// @notice Running count of proposals (also used as proposal ID)
    uint256 public proposalCount;

    /// @notice Voting period in seconds (default: 3 days)
    uint256 public constant VOTING_PERIOD = 3 days;

    /// @notice Minimum votes required for a proposal to pass
    uint256 public constant QUORUM = 3;

    // ─────────────────────────── Data Structures ───────────────────────────

    /**
     * @notice Represents a governance proposal
     * @param id            Unique proposal ID
     * @param creator       Address that submitted the proposal
     * @param title         Short title of the proposal
     * @param ipfsHash      CID of the full proposal JSON pinned to IPFS
     * @param votesFor      Total votes in favour
     * @param votesAgainst  Total votes against
     * @param createdAt     Block timestamp when proposal was created
     * @param executed      Whether the proposal has been executed
     * @param passed        Whether the proposal passed after execution
     */
    struct Proposal {
        uint256 id;
        address creator;
        string  title;
        string  ipfsHash;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 createdAt;
        bool    executed;
        bool    passed;
    }

    /// @notice Maps proposal ID to Proposal struct
    mapping(uint256 => Proposal) public proposals;

    /// @notice Tracks whether an address has voted on a given proposal
    /// @dev proposalId => voter address => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // ─────────────────────────── Events ────────────────────────────────────

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        string  title,
        string  ipfsHash
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool    support,
        uint256 newVotesFor,
        uint256 newVotesAgainst
    );

    event ProposalExecuted(
        uint256 indexed proposalId,
        bool    passed
    );

    // ─────────────────────────── Modifiers ─────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "KodeBattleDAO: not owner");
        _;
    }

    /// @dev Requires msg.sender to hold at least 1 BadgeNFT to create proposals
    modifier onlyBadgeHolder() {
        IERC721 nft = IERC721(badgeNFTAddress);
        require(
            nft.balanceOf(msg.sender) > 0,
            "KodeBattleDAO: must hold a BadgeNFT to create proposals"
        );
        _;
    }

    // ─────────────────────────── Constructor ───────────────────────────────

    /**
     * @notice Deploy the DAO with a reference to the BadgeNFT contract
     * @param _badgeNFTAddress Address of the BadgeNFT.sol contract (from Assignment 1)
     */
    constructor(address _badgeNFTAddress) {
        require(_badgeNFTAddress != address(0), "KodeBattleDAO: invalid NFT address");
        owner          = msg.sender;
        badgeNFTAddress = _badgeNFTAddress;
    }

    // ─────────────────────────── Core Functions ────────────────────────────

    /**
     * @notice Create a new governance proposal (requires BadgeNFT)
     * @param title     Short description of the proposal
     * @param ipfsHash  CID of the JSON pinned to IPFS (from Assignment 4)
     */
    function createProposal(string memory title, string memory ipfsHash)
        external
        onlyBadgeHolder
    {
        require(bytes(title).length > 0,     "KodeBattleDAO: title required");
        require(bytes(ipfsHash).length > 0,  "KodeBattleDAO: IPFS hash required");

        proposalCount++;

        proposals[proposalCount] = Proposal({
            id:           proposalCount,
            creator:      msg.sender,
            title:        title,
            ipfsHash:     ipfsHash,
            votesFor:     0,
            votesAgainst: 0,
            createdAt:    block.timestamp,
            executed:     false,
            passed:       false
        });

        emit ProposalCreated(proposalCount, msg.sender, title, ipfsHash);
    }

    /**
     * @notice Cast a vote on an active proposal
     * @param proposalId  ID of the proposal to vote on
     * @param support     true = vote FOR, false = vote AGAINST
     */
    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];

        require(p.id != 0,                              "KodeBattleDAO: proposal not found");
        require(!p.executed,                            "KodeBattleDAO: proposal already executed");
        require(!hasVoted[proposalId][msg.sender],      "KodeBattleDAO: already voted");
        require(
            block.timestamp <= p.createdAt + VOTING_PERIOD,
            "KodeBattleDAO: voting period ended"
        );

        // Record the vote
        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            p.votesFor++;
        } else {
            p.votesAgainst++;
        }

        emit VoteCast(proposalId, msg.sender, support, p.votesFor, p.votesAgainst);
    }

    /**
     * @notice Execute a proposal after the voting period ends
     * @dev Only the owner can execute. Proposal passes if votesFor >= QUORUM and > votesAgainst.
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external onlyOwner {
        Proposal storage p = proposals[proposalId];

        require(p.id != 0,               "KodeBattleDAO: proposal not found");
        require(!p.executed,             "KodeBattleDAO: already executed");
        require(
            block.timestamp > p.createdAt + VOTING_PERIOD,
            "KodeBattleDAO: voting period not over yet"
        );

        p.executed = true;
        p.passed   = (p.votesFor >= QUORUM) && (p.votesFor > p.votesAgainst);

        emit ProposalExecuted(proposalId, p.passed);
    }

    // ─────────────────────────── View Functions ────────────────────────────

    /**
     * @notice Get all details of a specific proposal
     */
    function getProposal(uint256 proposalId)
        external
        view
        returns (Proposal memory)
    {
        return proposals[proposalId];
    }

    /**
     * @notice Check if voting is still open for a proposal
     */
    function isVotingOpen(uint256 proposalId) external view returns (bool) {
        Proposal storage p = proposals[proposalId];
        return !p.executed && block.timestamp <= p.createdAt + VOTING_PERIOD;
    }

    /**
     * @notice Check if the msg.sender holds a BadgeNFT
     */
    function isBadgeHolder(address user) external view returns (bool) {
        return IERC721(badgeNFTAddress).balanceOf(user) > 0;
    }
}
