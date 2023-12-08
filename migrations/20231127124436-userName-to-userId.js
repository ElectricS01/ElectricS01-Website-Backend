/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn("messages", "username", "userId")
    await queryInterface.changeColumn("Messages", "userId", {
      type: Sequelize.INTEGER
    })
  }
}
