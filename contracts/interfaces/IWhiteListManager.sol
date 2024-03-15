// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface IWhiteListManager {
    function addRoot(bytes32 merkleRoot) external;

    function check(
        uint256 index,
        address account,
        bytes32 merkleRoot,
        bytes32[] calldata merkleProof
    ) external view returns (bool);
}