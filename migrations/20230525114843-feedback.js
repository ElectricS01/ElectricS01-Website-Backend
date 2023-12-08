/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async down(queryInterface) {
    await queryInterface.dropTable("Feedback")
  },
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Feedback", {
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      feedback: {
        type: Sequelize.STRING
      },
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
