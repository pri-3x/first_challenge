const { expect } = require("chai");
const { ethers } = require("hardhat");

// Voucher helper: operator signs keccak256(abi.encodePacked(to, amount)) with
// the EIP-191 personal-message prefix (what ethers' signMessage applies).
async function signVoucher(operator, to, amount) {
  const message = ethers.solidityPackedKeccak256(["address", "uint256"], [to, amount]);
  const sig = await operator.signMessage(ethers.getBytes(message));
  return ethers.Signature.from(sig);
}

describe("SignatureVault", function () {
  const VOUCHER_AMOUNT = ethers.parseEther("1");
  const VAULT_FUNDING = ethers.parseEther("10");

  async function deploy() {
    const [deployer, player] = await ethers.getSigners();
    const operator = ethers.Wallet.createRandom();

    const Vault = await ethers.getContractFactory("SignatureVault");
    const vault = await Vault.deploy(operator.address, { value: VAULT_FUNDING });
    await vault.waitForDeployment();

    const sig = await signVoucher(operator, player.address, VOUCHER_AMOUNT);
    return { vault, deployer, player, operator, sig };
  }

  it("honours a single valid voucher", async function () {
    const { vault, player, sig } = await deploy();
    await vault.redeem(player.address, VOUCHER_AMOUNT, sig.v, sig.r, sig.s);
    expect(await vault.totalReleased()).to.equal(VOUCHER_AMOUNT);
    expect(await vault.solved()).to.equal(false);
  });

  it("rejects a voucher not signed by the operator", async function () {
    const { vault, player } = await deploy();
    const impostor = ethers.Wallet.createRandom();
    const forged = await signVoucher(impostor, player.address, VOUCHER_AMOUNT);
    await expect(
      vault.redeem(player.address, VOUCHER_AMOUNT, forged.v, forged.r, forged.s)
    ).to.be.revertedWith("bad signature");
  });

  it("rejects a tampered amount", async function () {
    const { vault, player, sig } = await deploy();
    await expect(
      vault.redeem(player.address, ethers.parseEther("10"), sig.v, sig.r, sig.s)
    ).to.be.revertedWith("bad signature");
  });

  it("is solved by replaying the single voucher until the vault is empty", async function () {
    const { vault, player, sig } = await deploy();

    // The voucher authorizes only 1 ETH, but there is no nonce or used-flag, so
    // the same signature can be submitted repeatedly to drain all 10 ETH.
    for (let i = 0; i < 10; i++) {
      await vault.redeem(player.address, VOUCHER_AMOUNT, sig.v, sig.r, sig.s);
    }

    expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(0n);
    expect(await vault.totalReleased()).to.equal(VAULT_FUNDING);
    expect(await vault.solved()).to.equal(true);
  });
});
