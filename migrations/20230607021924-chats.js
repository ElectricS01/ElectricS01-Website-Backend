
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Messages", "chatId", {
      type: Sequelize.INTEGER
    })
    await queryInterface.createTable("Chats", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING,
        defaultValue: "New Chat"
      },
      description: {
        type: Sequelize.STRING,
        defaultValue: "This is a new chat"
      },
      icon: {
        type: Sequelize.STRING
      },
      owner: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      requireVerification: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable("Chats")
  }
}
