import _ from 'lodash'
import { solidity } from "ethereum-waffle"
import chai from "chai"
import { utils } from "ethers"
import { ethers, deployments } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { StandardMerkleTree } from "@openzeppelin/merkle-tree"
import {
  ERC721Mintable,
  WhiteListManager,
  Minter,
} from '../build/typechain'

chai.use(solidity)
const { expect } = chai
const { get } = deployments

describe("Integrate", () => {
  let owner: SignerWithAddress
  let dev: SignerWithAddress
  let attacker: SignerWithAddress
  let nft: ERC721Mintable
  let manager: WhiteListManager
  let minter: Minter

  const networkId = 0

  const setup = deployments.createFixture(
    async ({ deployments, ethers }) => {
      await deployments.fixture()

      const signers = await ethers.getSigners();
      [ owner, dev, attacker ] = signers

      nft = (await ethers.getContractAt(
        "ERC721Mintable",
        (await get("ERC721Mintable")).address
      )) as ERC721Mintable

      manager = (await ethers.getContractAt(
        "WhiteListManager",
        (await get("WhiteListManager")).address
      )) as WhiteListManager

      minter = (await ethers.getContractAt(
        "Minter",
        (await get("Minter")).address
      )) as Minter
    }
  )

  beforeEach(async () => {
    await setup()
  })

  describe('mint', () => {
    it('User could mint without proof only once', async () => {
      await expect(minter.onMessageReceived(
        dev.address,
        networkId,
        '0x'
      ))
      .changeTokenBalance(nft, dev.address, 1)

      await expect(minter.onMessageReceived(
        dev.address,
        networkId,
        '0x'
      )).to.be.revertedWith('ExcceedMaxTimes')
    })
    
    it('User could mint with proof up to 5 times', async() => {
      const values = [
        [ '0', owner.address ],
        [ '1', dev.address ],
      ]

      const tree = StandardMerkleTree.of(values, ["uint256", "address"])
      const coder = utils.defaultAbiCoder
      const root = tree.root
      const proof = tree.getProof(1)
      const data = coder.encode(
        [
          'uint256',
          'address',
          'bytes32',
          'bytes32[]'
        ],
        [
          '1',
          dev.address,
          root,
          proof
        ]
      )

      await manager.addRoot(root)
      expect(await manager.merkleRootExist(root)).eq(true)

      expect(await manager.verified(dev.address)).eq(false)

      await expect(minter.onMessageReceived(
        dev.address,
        networkId,
        data
      ))
      .changeTokenBalance(nft, dev.address, 1)

      expect(await manager.verified(dev.address)).eq(true)

      for (let i = 1; i < 5; i++) {
        await expect(minter.onMessageReceived(
            dev.address,
            networkId,
            '0x'
        ))
        .changeTokenBalance(nft, dev.address, 1)
      }

      await expect(minter.onMessageReceived(
        dev.address,
        networkId,
        '0x'
      )).to.be.revertedWith('ExcceedMaxTimes')

      await expect(minter.onMessageReceived(
        attacker.address,
        networkId,
        data
      )).to.be.revertedWith('InvalidProof')
    })
  })
})