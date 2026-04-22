// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Battle
 * @notice Simple contract for Assignment 2 deployment on Polygon Amoy
 */
contract Battle {
    string public battleName;
    address public owner;

    constructor(string memory _name) {
        battleName = _name;
        owner = msg.sender;
    }

    function setBattleName(string memory _newName) public {
        require(msg.sender == owner, "Only owner can change name");
        battleName = _newName;
    }
}
