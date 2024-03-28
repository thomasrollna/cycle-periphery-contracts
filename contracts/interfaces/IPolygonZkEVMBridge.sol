// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface IPolygonZkEVMBridge {

    function bridgeMessage(
        uint32 destinationNetwork,
        address destinationAddress,
        bool forceUpdateGlobalExitRoot,
        bytes calldata metadata
    ) external payable;

    function networkID() external view returns (uint32);
}
