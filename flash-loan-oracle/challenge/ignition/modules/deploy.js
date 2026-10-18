const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const ether = (amount) => BigInt(amount) * 10n ** 18n;

module.exports = buildModule("LenderModule", (m) => {
  const weth = m.contract("Asset", ["Wrapped Ether", "WETH"], { id: "WETH" });
  const usd = m.contract("Asset", ["Dollar", "USD"], { id: "USD" });
  const pool = m.contract("SpotPool", [weth, usd]);
  const flash = m.contract("FlashLender", [weth]);
  const lender = m.contract("Lender", [weth, usd, pool]);

  const seedPoolWeth = m.call(weth, "mint", [pool, ether(100)], { id: "seedPoolWeth" });
  const seedPoolUsd = m.call(usd, "mint", [pool, ether(200000)], { id: "seedPoolUsd" });
  m.call(weth, "mint", [flash, ether(5000)], { id: "seedFlash" });
  m.call(weth, "mint", [lender, ether(50)], { id: "seedLender" });
  m.call(pool, "initialize", [], { id: "initPool", after: [seedPoolWeth, seedPoolUsd] });

  for (let i = 1; i <= 5; i++) {
    const account = m.getAccount(i);
    m.call(weth, "mint", [account, ether(1)], { id: `playerWeth${i}` });
    m.call(usd, "mint", [account, ether(10000)], { id: `playerUsd${i}` });
  }

  return { weth, usd, pool, flash, lender };
});
