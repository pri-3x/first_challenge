const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const COLLECTOR_ABI = [
  "function solved() view returns (bool)",
  "function solver() view returns (address)",
  "function REQUIRED() view returns (uint256)",
];

async function getState() {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deploymentsPath = path.join(
    __dirname,
    "ignition",
    "deployments",
    "chain-31337",
    "deployed_addresses.json"
  );
  const data = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const tokenAddress = data["WorkshopModule#WorkshopToken"];
  const collectorAddress = data["WorkshopModule#Collector"];
  if (!tokenAddress || !collectorAddress) {
    throw new Error("Workshop deployment is missing");
  }

  const collector = new ethers.Contract(collectorAddress, COLLECTOR_ABI, provider);
  const [solved, required] = await Promise.all([
    collector.solved(),
    collector.REQUIRED(),
  ]);
  const network = await provider.getNetwork();

  return {
    tokenAddress,
    collectorAddress,
    solved,
    required: required.toString(),
    network: rpcUrl,
    chainId: Number(network.chainId),
  };
}

module.exports = getState;
