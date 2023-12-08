/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Chats", "allowInvite", {
      allowNull: false,
      defaultValue: "Member",
      type: Sequelize.STRING
    })
  }
}
