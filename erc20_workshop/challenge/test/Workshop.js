const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Workshop", function () {
  const REQUIRED = ethers.parseEther("25");
  const CLAIM = ethers.parseEther("100");

  async function deploy() {
    const [player, other] = await ethers.getSigners();
    const token = await ethers.deployContract("WorkshopToken");
    const collector = await ethers.deployContract("Collector", [await token.getAddress()]);
    return { player, other, token, collector };
  }

  it("lets an account claim 100 WORK once", async function () {
    const { player, token } = await deploy();

    await token.claim();

    expect(await token.balanceOf(player.address)).to.equal(CLAIM);
    expect(await token.claimed(player.address)).to.equal(true);
    await expect(token.claim()).to.be.revertedWith("Already claimed");
  });

  it("rejects collect when the allowance is missing, too small, or too large", async function () {
    const { token, collector } = await deploy();
    const collectorAddress = await collector.getAddress();

    await token.claim();
    await expect(collector.collect()).to.be.revertedWithCustomError(collector, "AllowanceNotExact");

    await token.approve(collectorAddress, 25);
    await expect(collector.collect()).to.be.revertedWithCustomError(collector, "AllowanceNotExact");

    await token.approve(collectorAddress, ethers.parseEther("26"));
    await expect(collector.collect()).to.be.revertedWithCustomError(collector, "AllowanceNotExact");
    expect(await collector.solved()).to.equal(false);
  });

  it("does not solve when tokens are transferred directly", async function () {
    const { token, collector } = await deploy();

    await token.claim();
    await token.transfer(await collector.getAddress(), REQUIRED);

    expect(await token.balanceOf(await collector.getAddress())).to.equal(REQUIRED);
    expect(await collector.solved()).to.equal(false);
  });

  it("solves only after an exact approval and collect", async function () {
    const { player, token, collector } = await deploy();
    const collectorAddress = await collector.getAddress();

    await token.claim();
    await token.approve(collectorAddress, REQUIRED);
    await collector.collect();

    expect(await collector.solved()).to.equal(true);
    expect(await collector.solver()).to.equal(player.address);
    expect(await token.balanceOf(collectorAddress)).to.equal(REQUIRED);
    expect(await token.balanceOf(player.address)).to.equal(ethers.parseEther("75"));
    await expect(collector.collect()).to.be.revertedWith("Already solved");
  });

  it("reverts collect when the exact allowance is set but the balance is short", async function () {
    const { player, other, token, collector } = await deploy();
    const collectorAddress = await collector.getAddress();

    await token.claim();
    await token.transfer(other.address, ethers.parseEther("80"));
    await token.approve(collectorAddress, REQUIRED);

    await expect(collector.collect()).to.be.revertedWith("Balance too low");
    expect(await collector.solved()).to.equal(false);
    expect(await token.balanceOf(player.address)).to.equal(ethers.parseEther("20"));
  });
});
