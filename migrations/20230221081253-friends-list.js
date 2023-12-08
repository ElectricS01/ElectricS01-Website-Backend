/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async down(queryInterface) {
    await queryInterface.dropTable("Friends")
  },
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
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      friendId: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      status: {
        allowNull: false,
        defaultValue: "pending",
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
