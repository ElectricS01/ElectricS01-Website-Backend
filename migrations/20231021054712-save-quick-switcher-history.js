/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async down(queryInterface) {
    await queryInterface.dropTable("SwitcherHistory")
  },
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "saveSwitcher", {
      defaultValue: true,
      type: Sequelize.BOOLEAN
    })
    await queryInterface.addColumn("Users", "switcherHistory", {
      defaultValue: [],
      type: Sequelize.JSON
    })
  }
}
