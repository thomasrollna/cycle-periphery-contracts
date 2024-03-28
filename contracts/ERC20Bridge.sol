// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/interfaces/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { IPolygonZkEVMBridge } from "./interfaces/IPolygonZkEVMBridge.sol";
import { TokenWrapped } from "./lib/TokenWrapped.sol";

contract ERC20Bridge is Initializable {
    using SafeERC20 for IERC20;

    uint32 private constant TOKEN_FLAG_BIT_VALID = (1 << 0);
    uint32 private constant TOKEN_FLAG_BIT_WRAPPED = (1 << 1);

    struct TokenInformation {
        uint32 flags;
        address tokenAddress;
    }

    IPolygonZkEVMBridge public immutable polygonZkEVMBridge;

    address public admin;

    mapping(uint32 => TokenInformation) public tokenInfoMap;

    mapping(uint32 => address) public counterPartMap;

    event BridgeTokens(uint32 destinationNetwork, uint32 tokenId, address destinationAddress, uint256 receivedAmount);
    event ClaimTokens(uint32 tokenId, address destinationAddress, uint256 amount);
    event AddToken(uint32 tokenId, uint32 flags, string name, string symbol);

    error OnlyAdmin();

    modifier onlyAdmin() {
        if (admin != msg.sender) {
            revert OnlyAdmin();
        }
        _;
    }

    constructor(address _polygonZkEVMBridge) {
        polygonZkEVMBridge = IPolygonZkEVMBridge(_polygonZkEVMBridge);
    }

    function initialize(
        address _admin
    ) external virtual initializer {
        admin = _admin;
    }

    function networkID() public view returns (uint32) {
        return polygonZkEVMBridge.networkID();
    }

    function setCounterPart(uint32 _networkId, address _counterPartAddress) external onlyAdmin {
        require(_networkId != networkID(), "invalid networkId");
        counterPartMap[_networkId] = _counterPartAddress;
    }

    function getCounterPart(uint32 _networkId) internal view returns (address) {
        address exist = counterPartMap[_networkId];
        return (exist == address(0)) ? address(this) : exist;
    }

    function addWrappedToken(
        uint32 _tokenId,
        string memory _name,
        string memory _symbol
    ) external onlyAdmin {
        require(tokenInfoMap[_tokenId].flags & TOKEN_FLAG_BIT_VALID == 0, "token already exist");

        TokenWrapped newWrappedToken = (new TokenWrapped){
            salt: bytes32(uint256(_tokenId))
        }(_name, _symbol, 18);
        uint32 flags = TOKEN_FLAG_BIT_VALID | TOKEN_FLAG_BIT_WRAPPED;
        tokenInfoMap[_tokenId] = TokenInformation(flags, address(newWrappedToken));
        emit AddToken(_tokenId, flags, _name, _symbol);
    }

    function addExistToken(uint32 _tokenId, address _token) external onlyAdmin {
        require(tokenInfoMap[_tokenId].flags & TOKEN_FLAG_BIT_VALID == 0, "token already exist");
        uint8 decimals = _safeDecimals(_token);
        require(decimals <= 18, "invalid decimals");

        uint32 flags = TOKEN_FLAG_BIT_VALID | (uint32(decimals) << 24);
        tokenInfoMap[_tokenId] = TokenInformation(flags, _token);
        emit AddToken(_tokenId, flags, _safeName(_token), _safeSymbol(_token));
    }

    function onMessageReceived(
        address originAddress,
        uint32 originNetwork,
        bytes memory data
    ) external payable {
        require(
            msg.sender == address(polygonZkEVMBridge),
            "ERC20Bridge: Not PolygonZkEVMBridge"
        );

        require(
            getCounterPart(originNetwork) == originAddress,
            "ERC20Bridge: Not counterpart contract"
        );

        _onMessageReceived(data);
    }

     function bridgeToken(
        uint32 destinationNetwork,
        uint32 tokenId,
        address destinationAddress,
        uint256 amount,
        uint32 finalNetwork
    ) external {
        uint256 receivedAmount = _receiveTokens(tokenId, amount);
        bytes memory messageData = abi.encode(tokenId, destinationAddress, receivedAmount, finalNetwork);

        polygonZkEVMBridge.bridgeMessage(
            destinationNetwork,
            getCounterPart(destinationNetwork),
            true,
            messageData
        );

        emit BridgeTokens(destinationNetwork, tokenId, destinationAddress, receivedAmount);
    }

    function _onMessageReceived(bytes memory data) internal {
        (uint32 tokenId, address destinationAddress, uint256 amount, uint32 finalNetwork) = abi.decode(
            data,
            (uint32, address, uint256, uint32)
        );

        if (networkID() != finalNetwork) {
            polygonZkEVMBridge.bridgeMessage(
                finalNetwork,
                getCounterPart(finalNetwork),
                true,
                data
            );
        } else {
            _transferTokens(tokenId, destinationAddress, amount);
            emit ClaimTokens(tokenId, destinationAddress, amount);
        }
    }

    function _receiveTokens(uint32 tokenId, uint256 amount) internal returns (uint256 receivedAmount) {
        TokenInformation memory info = tokenInfoMap[tokenId];
        require(info.flags & TOKEN_FLAG_BIT_VALID == TOKEN_FLAG_BIT_VALID, "invalid token");

        address token = info.tokenAddress;
        if (info.flags & TOKEN_FLAG_BIT_WRAPPED > 0) {
            TokenWrapped(token).burn(msg.sender, amount);
            receivedAmount = amount;
        } else {
            uint256 balanceBefore = IERC20(token).balanceOf(
                address(this)
            );
            IERC20(token).safeTransferFrom(
                msg.sender,
                address(this),
                amount
            );
            uint256 balanceAfter = IERC20(token).balanceOf(
                address(this)
            );
            receivedAmount = balanceAfter - balanceBefore;
            uint8 decimals = uint8(info.flags >> 24);
            if (decimals != 18) {
                receivedAmount = receivedAmount * (10 ** (18 - decimals));
            }
        }
    }

    function _transferTokens(
        uint32 tokenId,
        address destinationAddress,
        uint256 amount
    ) internal {
        TokenInformation memory info = tokenInfoMap[tokenId];
        require(info.flags & TOKEN_FLAG_BIT_VALID == TOKEN_FLAG_BIT_VALID, "invalid token");

        address token = info.tokenAddress;
        if (info.flags & TOKEN_FLAG_BIT_WRAPPED > 0) {
            TokenWrapped(token).mint(destinationAddress, amount);
        } else {
            uint8 decimals = uint8(info.flags >> 24);
            if (decimals != 18) {
                amount = amount / (10 ** (18 - decimals));
            }
            IERC20(token).safeTransfer(destinationAddress, amount);
        }
    }

    function _safeSymbol(address token) internal view returns (string memory) {
        (bool success, bytes memory data) = address(token).staticcall(
            abi.encodeCall(IERC20Metadata.symbol, ())
        );
        return success ? _returnDataToString(data) : "NO_SYMBOL";
    }

    function _safeName(address token) internal view returns (string memory) {
        (bool success, bytes memory data) = address(token).staticcall(
            abi.encodeCall(IERC20Metadata.name, ())
        );
        return success ? _returnDataToString(data) : "NO_NAME";
    }

    function _safeDecimals(address token) internal view returns (uint8) {
        (bool success, bytes memory data) = address(token).staticcall(
            abi.encodeCall(IERC20Metadata.decimals, ())
        );
        return success && data.length == 32 ? abi.decode(data, (uint8)) : 18;
    }

    function _returnDataToString(
        bytes memory data
    ) internal pure returns (string memory) {
        if (data.length >= 64) {
            return abi.decode(data, (string));
        } else if (data.length == 32) {
            // Since the strings on bytes32 are encoded left-right, check the first zero in the data
            uint256 nonZeroBytes;
            while (nonZeroBytes < 32 && data[nonZeroBytes] != 0) {
                nonZeroBytes++;
            }

            // If the first one is 0, we do not handle the encoding
            if (nonZeroBytes == 0) {
                return "NOT_VALID_ENCODING";
            }
            // Create a byte array with nonZeroBytes length
            bytes memory bytesArray = new bytes(nonZeroBytes);
            for (uint256 i = 0; i < nonZeroBytes; i++) {
                bytesArray[i] = data[i];
            }
            return string(bytesArray);
        } else {
            return "NOT_VALID_ENCODING";
        }
    }
}