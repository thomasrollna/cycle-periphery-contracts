// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IWhiteListManager } from "./interfaces/IWhiteListManager.sol";

contract WhiteListManager is Ownable, IWhiteListManager {

    mapping(bytes32 => bool) public merkleRootExist;

    mapping(address => bool) public verified;

    event AddRoot(bytes32);

    constructor() Ownable(msg.sender) {}

    function addRoot(bytes32 merkleRoot) external onlyOwner {
        merkleRootExist[merkleRoot] = true;
        emit AddRoot(merkleRoot);
    }

    function verify(
        uint256 index,
        address account,
        bytes32 merkleRoot,
        bytes32[] calldata merkleProof
    ) external returns (bool) {
        if (merkleRootExist[merkleRoot] &&
            MerkleProof.verify(merkleProof, merkleRoot, keccak256(bytes.concat(keccak256(abi.encode(index, account)))))) {
            verified[account] = true;
            return true;
        }
        return false;
    }
}