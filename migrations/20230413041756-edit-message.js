/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Messages", "edited", {
      defaultValue: false,
      type: Sequelize.BOOLEAN
    })
  }
}
