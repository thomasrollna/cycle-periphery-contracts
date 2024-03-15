// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface IERC721Mintable {
    function mintFor(address to, uint256 tokenId) external;
}