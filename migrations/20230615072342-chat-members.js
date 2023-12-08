/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async down(queryInterface) {
    await queryInterface.dropTable("ChatAssociations")
  },
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Chats", "type", {
      allowNull: false,
      defaultValue: 0,
      type: Sequelize.INTEGER
    })
    await queryInterface.createTable("ChatAssociations", {
      chatId: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      type: {
        allowNull: false,
        defaultValue: "Member",
        type: Sequelize.STRING
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER
      }
    })
  }
}
