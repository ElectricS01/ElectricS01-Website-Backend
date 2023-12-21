/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ChatAssociations", "notifications", {
      defaultValue: 0,
      type: Sequelize.INTEGER
    })
  }
}
