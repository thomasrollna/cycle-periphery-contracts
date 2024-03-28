import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { isHardhat } from "../utils/network"

const tag = "ERC20Bridge"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, get } = deployments
  const { deployer } = await getNamedAccounts()

  const testing = isHardhat(await getChainId())
  const bridgeAddress = testing ? (await get('PolygonZkEVMBridgeMock')).address : '' // TODO: real PolygonZkEVMBridge

  await deploy(tag, {
    from: deployer,
    log: true,
    proxy: {
      execute: {
        init: {
          methodName: "initialize",
          args: [ deployer ],
        },
      },
      viaAdminContract: "ProxyAdmin",
      proxyContract: "OpenZeppelinTransparentProxy"
    },
    args: [ bridgeAddress ],
    skipIfAlreadyDeployed: true
  })
}

export default func
func.tags = [ tag ]
func.dependencies = [ "ProxyAdmin" ]