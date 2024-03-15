// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { IERC721Mintable } from "./interfaces/IERC721Mintable.sol";

contract ERC721Mintable is ERC721, Ownable, IERC721Mintable {

    constructor() ERC721("Piggy Box", "PGB") Ownable(msg.sender) {}

    function mintFor(address to, uint256 tokenId) external onlyOwner {
        _mint(to, tokenId);
    }
}