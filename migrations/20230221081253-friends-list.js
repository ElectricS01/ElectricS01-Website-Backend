/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "directMessages", {
      allowNull: false,
      defaultValue: "everyone",
      type: Sequelize.STRING
    })
    await queryInterface.addColumn("Users", "friendRequests", {
      allowNull: false,
      defaultValue: true,
      type: Sequelize.BOOLEAN
    })
    await queryInterface.addColumn("Users", "status", {
      allowNull: false,
      defaultValue: "online",
      type: Sequelize.STRING
    })
    await queryInterface.addColumn("Users", "statusMessage", {
      type: Sequelize.STRING
    })
    await queryInterface.createTable("Friends", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      friendId: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      status: {
        allowNull: false,
        type: Sequelize.STRING,
        defaultValue: "pending"
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
    await queryInterface.dropTable("Friends")
  }
}
