/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Passkeys", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        type: Sequelize.INTEGER
      },
      credentialID: {
        allowNull: false,
        type: Sequelize.TEXT,
        unique: true
      },
      credentialPublicKey: {
        allowNull: false,
        type: Sequelize.TEXT
      },
      counter: {
        allowNull: false,
        type: Sequelize.BIGINT
      },
      credentialDeviceType: {
        allowNull: false,
        type: Sequelize.STRING
      },
      credentialBackedUp: {
        allowNull: false,
        type: Sequelize.BOOLEAN
      },
      transports: {
        type: Sequelize.TEXT
      },
      name: {
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
    await queryInterface.dropTable("Passkeys")
  }
}
