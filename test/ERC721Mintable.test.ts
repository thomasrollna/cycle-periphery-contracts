import _ from 'lodash'
import { solidity } from "ethereum-waffle"
import chai from "chai"
import { ethers, deployments } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import {
  ERC721Mintable,
} from '../build/typechain'

chai.use(solidity)
const { expect } = chai
const { get } = deployments

describe("Integrate", () => {
  let owner: SignerWithAddress
  let dev: SignerWithAddress
  let attacker: SignerWithAddress
  let nft: ERC721Mintable

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
    }
  )

  beforeEach(async () => {
    await setup()
  })

  describe('mint', () => {
    it('User could not mint if not owner', async () => {
      await expect(nft.connect(attacker).mintFor(dev.address, 10))
        .to.be.revertedWith('OwnableUnauthorizedAccount')
    })
  })
})