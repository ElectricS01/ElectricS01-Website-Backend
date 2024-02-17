/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      username: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: true
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: true
      },
      password: {
        allowNull: false,
        type: Sequelize.STRING
      },
      emailVerified: {
        allowNull: false,
        type: Sequelize.BOOLEAN
      },
      emailToken: {
        allowNull: false,
        type: Sequelize.STRING
      },
      admin: {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN
      },
      avatar: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT
      },
      banner: {
        type: Sequelize.STRING
      },
      showCreated: {
        defaultValue: true,
        type: Sequelize.BOOLEAN
      },
      directMessages: {
        allowNull: false,
        defaultValue: "everyone",
        type: Sequelize.STRING
      },
      friendRequests: {
        allowNull: false,
        defaultValue: true,
        type: Sequelize.BOOLEAN
      },
      status: {
        allowNull: false,
        defaultValue: "online",
        type: Sequelize.STRING
      },
      statusMessage: {
        type: Sequelize.STRING
      },
      tetris: {
        type: Sequelize.STRING
      },
      tonkGame: {
        type: Sequelize.STRING
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
    await queryInterface.dropTable("Users")
  }
}
