

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Chats", "allowInvite", {
      allowNull: false,
      type: Sequelize.STRING,
      defaultValue: "Member"
    })
  }
}
