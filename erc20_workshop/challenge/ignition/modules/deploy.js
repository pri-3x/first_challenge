const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("WorkshopModule", (m) => {
  const token = m.contract("WorkshopToken");
  const collector = m.contract("Collector", [token]);

  return { token, collector };
});
