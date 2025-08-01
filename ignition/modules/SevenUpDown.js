const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const SevenUpDownModule = buildModule("SevenUpDownModule", (m) => {
  // Deploy the SevenUpDown contract
  const sevenUpDown = m.contract("SevenUpDown");

  return { sevenUpDown };
});

module.exports = SevenUpDownModule;