import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const tag = "WhiteListManager"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy(tag, {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true
  })
}

export default func
func.tags = [ tag ]