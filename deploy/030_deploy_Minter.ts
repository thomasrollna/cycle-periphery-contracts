import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { isHardhat } from "../utils/network"

const tag = "Minter"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, get } = deployments
  const { deployer } = await getNamedAccounts()

  const testing = isHardhat(await getChainId())
  const initialOwner = testing ? deployer : '' // TODO: PolygonZkEVMBridge

  await deploy(tag, {
    from: deployer,
    log: true,
    args: [
      initialOwner,
      (await get('ERC721Mintable')).address,
      (await get('WhiteListManager')).address
    ],
    skipIfAlreadyDeployed: true
  })
}

export default func
func.tags = [ tag ]
func.dependencies = [ "ERC721Mintable", "WhiteListManager" ]