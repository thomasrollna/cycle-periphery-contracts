import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const name = 'transferOwnership_ERC721Mintable'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { execute, get, getOrNull, save } = deployments
  const { deployer } = await getNamedAccounts()

  const task = await getOrNull(name)
  if (task) {
    return
  }

  await execute(
    'ERC721Mintable',
    { from: deployer, log: true },
    'transferOwnership',
    (await get('Minter')).address,
  )

  await save(name, {
    abi: (await get("ERC721Mintable")).abi,
    address: (await get("ERC721Mintable")).address
  })
}

export default func
func.tags = [ name ]
func.dependencies = [ 'Minter' ]