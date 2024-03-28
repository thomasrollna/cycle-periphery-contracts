// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20Bridge } from "../interfaces/IERC20Bridge.sol";

contract PolygonZkEVMBridgeMock {

    function bridgeMessage(
        uint32 destinationNetwork,
        address destinationAddress,
        bool forceUpdateGlobalExitRoot,
        bytes calldata metadata
    ) external payable {
        // mock, do nothing
    }

    function networkID() external view returns (uint32) {
        return 1;
    }

    function onMessageReceived(
        address target,
        address originAddress,
        uint32 originNetwork,
        bytes memory data
    ) external {
        IERC20Bridge(target).onMessageReceived(
            originAddress,
            originNetwork,
            data
        );
    }
}