import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { isMainnet } from "../utils/network"

const USD_TOKENS_ARGS: { [token: string]: any[] } = {
  USD: ["USD Coin", "USD", "6"]
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()

  for (const token in USD_TOKENS_ARGS) {
    const result = await deploy(token, {
      from: deployer,
      log: true,
      contract: "GenericERC20",
      args: USD_TOKENS_ARGS[token],
      skipIfAlreadyDeployed: true,
    })

    if (!isMainnet(await getChainId()) && result.newlyDeployed) {
      const decimals = USD_TOKENS_ARGS[token][2]
      await execute(
        token,
        { from: deployer, log: true },
        "mint",
        deployer,
        (10n ** BigInt(decimals)) * 1000000n,
      )
    }
  }
}

export default func
func.tags = ["USDTokens"]