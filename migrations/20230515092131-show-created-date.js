/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "showCreated", {
      defaultValue: true,
      type: Sequelize.BOOLEAN
    })
  }
}
