

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Messages", "messageContents", {
      type: Sequelize.TEXT
    })
    await queryInterface.changeColumn("Chats", "description", {
      type: Sequelize.TEXT,
      defaultValue: "This is a new chat"
    })
  }
}
