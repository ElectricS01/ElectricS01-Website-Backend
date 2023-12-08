/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async down(queryInterface) {
    await queryInterface.dropTable("Users")
  },
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      admin: {
        type: Sequelize.BOOLEAN
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      email: {
        type: Sequelize.STRING
      },
      emailToken: {
        type: Sequelize.STRING
      },
      emailVerified: {
        type: Sequelize.BOOLEAN
      },
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      password: {
        type: Sequelize.STRING
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      username: {
        type: Sequelize.STRING
      }
    })
  }
}
