/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Chats", {
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
      description: {
        defaultValue: "This is a new chat",
        type: Sequelize.TEXT
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
        defaultValue: true,
        type: Sequelize.BOOLEAN
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
