// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BattleStaking
 * @dev Manages 1v1 wagers with automatic platform fee distribution (Option B)
 */
contract BattleStaking {
    address public owner;
    uint256 public platformFeePercentage = 10; // 10% of total pool (leaving 1.8x for winner)

    struct Match {
        address player1;
        address player2;
        uint256 stake;
        bool resolved;
        address winner;
        bool exists;
    }

    mapping(string => Match) public matches;

    event MatchCreated(string matchId, address player1, uint256 stake);
    event MatchJoined(string matchId, address player2);
    event MatchResolved(string matchId, address winner, uint256 prize, uint256 fee);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @dev Player 1 creates a match and stakes MATIC
     */
    function createMatch(string memory matchId) external payable {
        require(msg.value > 0, "Stake must be greater than 0");
        require(!matches[matchId].exists, "Match already exists");

        matches[matchId] = Match({
            player1: msg.sender,
            player2: address(0),
            stake: msg.value,
            resolved: false,
            winner: address(0),
            exists: true
        });

        emit MatchCreated(matchId, msg.sender, msg.value);
    }

    /**
     * @dev Player 2 joins the match and must match the stake exactly
     */
    function joinMatch(string memory matchId) external payable {
        Match storage battle = matches[matchId];
        require(battle.exists, "Match does not exist");
        require(battle.player2 == address(0), "Match already full");
        require(msg.value == battle.stake, "Must match the exact stake");

        battle.player2 = msg.sender;
        emit MatchJoined(matchId, msg.sender);
    }

    /**
     * @dev Resolves the match and distributes funds immediately (Option B)
     */
    function resolveMatch(string memory matchId, address winner) external {
        Match storage battle = matches[matchId];
        require(battle.exists, "Match does not exist");
        require(!battle.resolved, "Already resolved");
        require(winner == battle.player1 || winner == battle.player2, "Winner must be a participant");

        uint256 totalPool = battle.stake * 2;
        uint256 fee = (totalPool * platformFeePercentage) / 100;
        uint256 prize = totalPool - fee;

        battle.resolved = true;
        battle.winner = winner;

        // Use call instead of transfer so payouts remain compatible with modern EVM gas rules.
        (bool prizeSent, ) = payable(winner).call{value: prize}("");
        require(prizeSent, "Prize transfer failed");

        (bool feeSent, ) = payable(owner).call{value: fee}("");
        require(feeSent, "Fee transfer failed");

        emit MatchResolved(matchId, winner, prize, fee);
    }

    /**
     * @dev Utility to update platform fee percentage
     */
    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 20, "Fee cannot exceed 20%");
        platformFeePercentage = _newFee;
    }

    /**
     * @dev Simple getter to verify a match exists
     */
    function getMatch(string memory matchId) external view returns (address p1, bool exists) {
        return (matches[matchId].player1, matches[matchId].exists);
    }

    /**
     * @dev Allow transferring ownership (e.g. to professional DAO or different wallet)
     */
    /**
     * @dev Allows Player 1 to cancel the match and get a refund if no one joined
     */
    function cancelMatch(string memory matchId) external {
        Match storage battle = matches[matchId];
        require(battle.exists, "Match does not exist");
        require(battle.player2 == address(0), "Cannot cancel: opponent already joined");
        require(msg.sender == battle.player1, "Only P1 can cancel");
        require(!battle.resolved, "Already resolved");

        battle.resolved = true;
        (bool refunded, ) = payable(battle.player1).call{value: battle.stake}("");
        require(refunded, "Refund transfer failed");
    }
}
