// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BadgeNFT
 * @notice Dynamic NFT badges for leaderboard top players
 * @dev Minted to top-ranked players, burned when they drop out.
 *      Demonstrates NFT-based verifiable ownership of achievements.
 */
contract BadgeNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;
    mapping(address => mapping(bytes32 => bool)) private _mintedBadges;

    event BadgeMinted(address indexed to, uint256 tokenId);
    event BadgeBurned(uint256 tokenId);

    constructor() ERC721("KodeBattle Badge", "KBB") Ownable(msg.sender) {}

    /**
     * @notice Mint a new badge NFT to a user
     * @param to Address to mint the badge to
     * @param uri IPFS URI containing badge metadata
     * @return tokenId The ID of the newly minted token
     */
    function mintBadge(string memory badgeId, string memory uri) public returns (uint256) {
        bytes32 badgeKey = keccak256(bytes(badgeId));
        require(!_mintedBadges[msg.sender][badgeKey], "Badge already minted");

        uint256 tokenId = _nextTokenId++;
        _mintedBadges[msg.sender][badgeKey] = true;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        emit BadgeMinted(msg.sender, tokenId);
        return tokenId;
    }

    function hasMintedBadge(address user, string memory badgeId) public view returns (bool) {
        return _mintedBadges[user][keccak256(bytes(badgeId))];
    }

    /**
     * @notice Burn a badge NFT (when user drops from leaderboard)
     * @param tokenId ID of the token to burn
     */
    function burnBadge(uint256 tokenId) public onlyOwner {
        _burn(tokenId);
        emit BadgeBurned(tokenId);
    }

    // Required overrides for Solidity multiple inheritance
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
}
