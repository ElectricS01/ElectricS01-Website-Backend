/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async down(queryInterface) {
    await queryInterface.dropTable("Sessions")
  },
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Sessions", {
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      expiredAt: {
        type: Sequelize.STRING
      },
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      token: {
        allowNull: false,
        type: Sequelize.STRING
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      userId: {
        allowNull: false,
        type: Sequelize.STRING
      }
    })
  }
}
