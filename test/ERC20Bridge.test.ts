import _ from 'lodash'
import { solidity } from "ethereum-waffle"
import chai from "chai"
import { ethers, deployments } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import {
  ERC20Bridge, GenericERC20, PolygonZkEVMBridgeMock,
} from '../build/typechain'
import { constants, utils } from 'ethers'

chai.use(solidity)
const { expect } = chai
const { get } = deployments

describe("ERC20Bridge", () => {
  let owner: SignerWithAddress
  let dev: SignerWithAddress
  let attacker: SignerWithAddress
  let bridge: ERC20Bridge
  let usd: GenericERC20
  let emvBridge: PolygonZkEVMBridgeMock
  let usdDecimals = 18

  const tokenId = 1

  const setup = deployments.createFixture(
    async ({ deployments, ethers }) => {
      await deployments.fixture()

      const signers = await ethers.getSigners();
      [ owner, dev, attacker ] = signers

      bridge = (await ethers.getContractAt(
        "ERC20Bridge",
        (await get("ERC20Bridge")).address
      )) as ERC20Bridge

      usd = (await ethers.getContractAt(
        "GenericERC20",
        (await get("USD")).address,
      )) as GenericERC20

      emvBridge = (await ethers.getContractAt(
        "PolygonZkEVMBridgeMock",
        (await get("PolygonZkEVMBridgeMock")).address,
      )) as PolygonZkEVMBridgeMock

      usdDecimals = await usd.decimals()

      await usd.mint(dev.address, 10n ** BigInt(usdDecimals) * 10000n)
      await usd.connect(dev).approve(bridge.address, constants.MaxUint256)
    }
  )

  beforeEach(async () => {
    await setup()
  })

  describe('addExistToken', () => {
    it('should be able to addExistToken', async () => {
      await expect(bridge.addExistToken(tokenId, usd.address))
        .to.emit(bridge, 'AddToken')
        .withArgs(
            tokenId,
            (1 + (usdDecimals << 24)),
            (await usd.name()),
            (await usd.symbol())
        )
    })

    it('could not addExistToken with duplicated tokenId', async () => {
      await bridge.addExistToken(tokenId, usd.address)
      await expect(bridge.addExistToken(tokenId, usd.address))
        .to.be.revertedWith('token already exist')
    })
  })

  describe('addWrappedToken', () => {
    it('should be able to addWrappedToken', async () => {
      await expect(bridge.addWrappedToken(tokenId, 'USDC', 'USDC'))
        .to.emit(bridge, 'AddToken')
        .withArgs(
          tokenId,
          3,
          'USDC',
          'USDC'
        )
    })

    it('could not addWrappedToken with duplicated tokenId', async () => {
        await bridge.addWrappedToken(tokenId, 'USDC', 'USDC')
        await expect(bridge.addWrappedToken(tokenId, 'USDC', 'USDC'))
          .to.be.revertedWith('token already exist')
    })
  })

  describe('bridgeToken', () => {
    beforeEach(async () => {
      await bridge.addExistToken(tokenId, usd.address)
    })

    it('should be able to bridgeToken', async () => {
      const amount = 10n ** BigInt(usdDecimals) * 3000n
      await expect(bridge.connect(dev).bridgeToken(1, tokenId, attacker.address, amount, 2))
        .to.emit(bridge, 'BridgeTokens')
        .withArgs(1, tokenId, attacker.address, amount * (10n ** (18n - BigInt(usdDecimals))))
        .changeTokenBalances(
          usd,
          [
            dev,
            bridge,
          ],
          [
            -amount,
            amount
          ]
        )
    })
  })

  describe('onMessageReceived', () => {
    beforeEach(async () => {
      await bridge.addExistToken(tokenId, usd.address)
    })

    it('should be able to onMessageReceived', async () => {
      const amount = 10n ** BigInt(usdDecimals) * 3000n
      const transferAmount = 10n ** 18n * 3000n
      const destinationAddress = dev.address

      await usd.mint(bridge.address, amount)
      const data = utils.defaultAbiCoder.encode(
        [ 'uint32', 'address', 'uint256', 'uint32' ],
        [ tokenId, destinationAddress, transferAmount, 1 ]
      )
      await expect(emvBridge.onMessageReceived(bridge.address, bridge.address, 0, data))
        .to.emit(bridge, 'ClaimTokens')
        .withArgs(tokenId, destinationAddress, transferAmount)
        .changeTokenBalances(
          usd,
          [
            bridge,
            dev,
          ],
          [
            -amount,
            amount
          ]
        )
    })

    it('should be able to route to other chain', async () => {
      const amount = 10n ** BigInt(usdDecimals) * 3000n
      const transferAmount = 10n ** 18n * 3000n
      const destinationAddress = dev.address

      const data = utils.defaultAbiCoder.encode(
        [ 'uint32', 'address', 'uint256', 'uint32' ],
        [ tokenId, destinationAddress, transferAmount, 2 ]
      )
      await expect(emvBridge.onMessageReceived(bridge.address, bridge.address, 0, data))
    })
  })
})