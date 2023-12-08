

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Messages", "embeds", {
      type: Sequelize.JSON,
      defaultValue: []
    })
  }
}
