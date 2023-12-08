

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Chats", "latest", {
      allowNull: false,
      type: Sequelize.DATE
    })
  }
}
