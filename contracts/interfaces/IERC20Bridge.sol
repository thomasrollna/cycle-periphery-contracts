// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface IERC20Bridge {
    function onMessageReceived(
        address originAddress,
        uint32 originNetwork,
        bytes memory data
    ) external payable;
}