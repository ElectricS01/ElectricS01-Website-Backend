/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Messages", "pinned", {
      allowNull: false,
      defaultValue: false,
      type: Sequelize.BOOLEAN
    })
  }
}
