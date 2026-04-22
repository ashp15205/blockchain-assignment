// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BattleStaking
 * @author Ashish Patil (PRN: 123B1B083)
 * @notice Assignment 1 – Smart Contract for 1v1 DSA Quiz Staking
 * @dev Implements a trustless 1v1 wager system.
 *      - Player 1 creates a match and locks ETH as stake.
 *      - Player 2 joins by matching the exact stake amount.
 *      - Owner (platform) resolves the match and winner receives 90% of the pool.
 *      - Platform collects 10% fee automatically — no manual intervention.
 */
contract BattleStaking {

    // ─────────────────────────── State Variables ───────────────────────────

    /// @notice Address of the contract owner (platform wallet)
    address public owner;

    /// @notice Platform fee percentage (default 10%)
    uint256 public platformFeePercentage = 10;

    // ─────────────────────────── Data Structures ───────────────────────────

    /**
     * @notice Represents a single 1v1 match
     * @param player1   Address of the match creator
     * @param player2   Address of the opponent (0x0 if not joined)
     * @param stake     Amount staked by each player (in wei)
     * @param resolved  Whether the match has been settled
     * @param winner    Address of the winner (0x0 if pending)
     * @param exists    Guard flag to prevent duplicate match IDs
     */
    struct Match {
        address player1;
        address player2;
        uint256 stake;
        bool    resolved;
        address winner;
        bool    exists;
    }

    /// @notice Maps a unique match ID string to a Match struct
    mapping(string => Match) public matches;

    // ─────────────────────────── Events ────────────────────────────────────

    event MatchCreated(string matchId, address indexed player1, uint256 stake);
    event MatchJoined(string matchId, address indexed player2);
    event MatchResolved(string matchId, address indexed winner, uint256 prize, uint256 fee);
    event MatchCancelled(string matchId, address indexed player1, uint256 refund);

    // ─────────────────────────── Modifiers ─────────────────────────────────

    /// @dev Restricts function to contract owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "BattleStaking: caller is not owner");
        _;
    }

    // ─────────────────────────── Constructor ───────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────── Core Functions ────────────────────────────

    /**
     * @notice Player 1 calls this to create a new match and stake ETH
     * @param matchId Unique string identifier for the match
     */
    function createMatch(string memory matchId) external payable {
        require(msg.value > 0,             "BattleStaking: stake must be > 0");
        require(!matches[matchId].exists,   "BattleStaking: match ID already exists");

        matches[matchId] = Match({
            player1:  msg.sender,
            player2:  address(0),
            stake:    msg.value,
            resolved: false,
            winner:   address(0),
            exists:   true
        });

        emit MatchCreated(matchId, msg.sender, msg.value);
    }

    /**
     * @notice Player 2 calls this to join an open match
     * @dev msg.value must exactly equal Player 1's stake
     * @param matchId The ID of the existing match to join
     */
    function joinMatch(string memory matchId) external payable {
        Match storage battle = matches[matchId];
        require(battle.exists,                        "BattleStaking: match not found");
        require(battle.player2 == address(0),         "BattleStaking: match already full");
        require(msg.value == battle.stake,            "BattleStaking: stake mismatch");

        battle.player2 = msg.sender;

        emit MatchJoined(matchId, msg.sender);
    }

    /**
     * @notice Resolves a match and distributes funds to the winner
     * @dev Uses the Checks-Effects-Interactions pattern for reentrancy safety.
     *      Prize = 90% of total pool. Fee = 10% sent to owner.
     * @param matchId Unique ID of the match to resolve
     * @param winner  Address of the winning player
     */
    function resolveMatch(string memory matchId, address winner) external {
        Match storage battle = matches[matchId];
        require(battle.exists,                                              "BattleStaking: match not found");
        require(!battle.resolved,                                           "BattleStaking: already resolved");
        require(winner == battle.player1 || winner == battle.player2,      "BattleStaking: invalid winner");

        // --- Calculations ---
        uint256 totalPool = battle.stake * 2;
        uint256 fee       = (totalPool * platformFeePercentage) / 100;
        uint256 prize     = totalPool - fee;

        // --- State change before external calls (Checks-Effects-Interactions) ---
        battle.resolved = true;
        battle.winner   = winner;

        // --- Interactions (external calls last) ---
        (bool prizeSent, ) = payable(winner).call{value: prize}("");
        require(prizeSent, "BattleStaking: prize transfer failed");

        (bool feeSent, ) = payable(owner).call{value: fee}("");
        require(feeSent,   "BattleStaking: fee transfer failed");

        emit MatchResolved(matchId, winner, prize, fee);
    }

    /**
     * @notice Allows Player 1 to cancel a match and get a full refund
     * @dev Only possible if Player 2 has not joined yet
     * @param matchId The ID of the match to cancel
     */
    function cancelMatch(string memory matchId) external {
        Match storage battle = matches[matchId];
        require(battle.exists,                    "BattleStaking: match not found");
        require(battle.player2 == address(0),     "BattleStaking: opponent already joined");
        require(msg.sender == battle.player1,     "BattleStaking: only creator can cancel");
        require(!battle.resolved,                 "BattleStaking: match already resolved");

        uint256 refund = battle.stake;
        battle.resolved = true; // Mark resolved to prevent re-entry

        (bool refunded, ) = payable(battle.player1).call{value: refund}("");
        require(refunded, "BattleStaking: refund failed");

        emit MatchCancelled(matchId, battle.player1, refund);
    }

    // ─────────────────────────── Admin Functions ───────────────────────────

    /**
     * @notice Update the platform fee (max 20%)
     * @param _newFee New fee percentage
     */
    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 20, "BattleStaking: fee cannot exceed 20%");
        platformFeePercentage = _newFee;
    }

    // ─────────────────────────── View Functions ────────────────────────────

    /**
     * @notice Check if a match exists and get Player 1's address
     * @param matchId The match ID to query
     */
    function getMatch(string memory matchId) external view returns (address p1, bool exists) {
        return (matches[matchId].player1, matches[matchId].exists);
    }

    /**
     * @notice Check the contract's current ETH balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
