import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { isHardhat } from "../utils/network"

const tag = "PolygonZkEVMBridgeMock"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const testing = isHardhat(await getChainId())
  if (!testing) return

  await deploy(tag, {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true
  })
}

export default func
func.tags = [ tag ]