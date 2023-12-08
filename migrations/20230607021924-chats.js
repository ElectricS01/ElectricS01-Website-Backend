/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async down(queryInterface) {
    await queryInterface.dropTable("Chats")
  },
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Messages", "chatId", {
      type: Sequelize.INTEGER
    })
    await queryInterface.createTable("Chats", {
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      description: {
        defaultValue: "This is a new chat",
        type: Sequelize.STRING
      },
      icon: {
        type: Sequelize.STRING
      },
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        allowNull: false,
        defaultValue: "New Chat",
        type: Sequelize.STRING
      },
      owner: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      requireVerification: {
        allowNull: false,
        defaultValue: true,
        type: Sequelize.BOOLEAN
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
  }
}
