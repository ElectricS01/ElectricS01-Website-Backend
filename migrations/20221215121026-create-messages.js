/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async down(queryInterface) {
    await queryInterface.dropTable("Messages")
  },
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Messages", {
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
      messageContents: {
        type: Sequelize.STRING
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      userId: {
        type: Sequelize.INTEGER
      }
    })
  }
}
