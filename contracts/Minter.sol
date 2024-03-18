// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC721Mintable } from "./interfaces/IERC721Mintable.sol";
import { IWhiteListManager } from "./interfaces/IWhiteListManager.sol";

contract Minter is Ownable {

    error NotAllow();

    error InvalidProof();

    error ExcceedMaxTimes();

    uint32 public constant MAX_FREE_MINT_TIMES = 1;

    uint32 public constant MAX_WHITE_LIST_MINT_TIMES = 5;

    uint256 public currentId;

    address public immutable whiteListManager;

    address public immutable nftAddress;

    // user address => networkId => mintTimes
    mapping(address => mapping(uint32 => uint32)) public mintTimes;

    constructor(address initialOwner, address _nftAddress, address _whiteListManager) Ownable(initialOwner) {
        nftAddress = _nftAddress;
        whiteListManager = _whiteListManager;
    }

    function onMessageReceived(
        address originAddress,
        uint32 originNetwork,
        bytes memory data
    ) external payable onlyOwner {
        uint32 times = mintTimes[originAddress][originNetwork];
        bool verified = IWhiteListManager(whiteListManager).verified(originAddress);

        if (!verified && data.length > 0) {
            (uint256 index, address account, bytes32 merkleRoot, bytes32[] memory merkleProof) = abi.decode(data, (uint256, address, bytes32, bytes32[]));
            if (account != originAddress) {
                revert InvalidProof();
            }
            if (!IWhiteListManager(whiteListManager).verify(index, account, merkleRoot, merkleProof)) {
                revert NotAllow();
            }
            verified = true;
        }

        if (times >= (verified ? MAX_WHITE_LIST_MINT_TIMES : MAX_FREE_MINT_TIMES)) {
            revert ExcceedMaxTimes();
        }

        mintTimes[originAddress][originNetwork] = times + 1;

        IERC721Mintable(nftAddress).mintFor(originAddress, currentId++);
    }
}