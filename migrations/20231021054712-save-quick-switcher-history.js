"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "saveSwitcher", {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    })
    await queryInterface.addColumn("Users", "switcherHistory", {
      type: Sequelize.JSON,
      defaultValue: []
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("SwitcherHistory")
  }
}
