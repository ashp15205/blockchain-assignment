// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BadgeNFT.sol";

/**
 * @title KodeBattleDAO
 * @notice Layer 5 Governance Layer
 * @dev Gated governance where only owners of a BadgeNFT can vote on protocol changes.
 */
contract KodeBattleDAO is Ownable {
    BadgeNFT public badgeNFT;

    struct Proposal {
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        bool exists;
        mapping(address => bool) hasVoted;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    event ProposalCreated(uint256 indexed proposalId, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _badgeNFT) Ownable(msg.sender) {
        badgeNFT = BadgeNFT(_badgeNFT);
    }

    modifier onlyBadgeHolder() {
        require(badgeNFT.balanceOf(msg.sender) > 0, "DAO: Must own a KodeBattle Badge and be a top player to vote");
        _;
    }

    /**
     * @notice Create a new governance proposal
     * @param _description Title or details of the proposal
     */
    function createProposal(string memory _description) public onlyOwner {
        proposalCount++;
        Proposal storage p = proposals[proposalCount];
        p.description = _description;
        p.exists = true;

        emit ProposalCreated(proposalCount, _description);
    }

    /**
     * @notice Vote on an active proposal
     * @param _proposalId The ID of the proposal
     * @param _support True for 'For', False for 'Against'
     */
    function vote(uint256 _proposalId, bool _support) public onlyBadgeHolder {
        Proposal storage p = proposals[_proposalId];
        require(p.exists, "DAO: Proposal does not exist");
        require(!p.hasVoted[msg.sender], "DAO: Already voted");
        require(!p.executed, "DAO: Proposal already executed");

        if (_support) {
            p.votesFor++;
        } else {
            p.votesAgainst++;
        }

        p.hasVoted[msg.sender] = true;
        emit Voted(_proposalId, msg.sender, _support);
    }

    /**
     * @notice Close a proposal and mark as executed
     */
    function executeProposal(uint256 _proposalId) public onlyOwner {
        Proposal storage p = proposals[_proposalId];
        require(p.exists, "DAO: Proposal does not exist");
        require(!p.executed, "DAO: Already executed");

        p.executed = true;
        emit ProposalExecuted(_proposalId);
    }
}
