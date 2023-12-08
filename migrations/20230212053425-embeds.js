/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Messages", "embeds", {
      defaultValue: [],
      type: Sequelize.JSON
    })
  }
}
