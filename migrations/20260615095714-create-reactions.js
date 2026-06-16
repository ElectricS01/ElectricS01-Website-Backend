/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Reactions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      messageId: {
        allowNull: false,
        references: {
          model: "Messages",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
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
      emoji: {
        allowNull: false,
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
    await queryInterface.addConstraint("Reactions", {
      fields: ["messageId", "userId", "emoji"],
      type: "unique",
      name: "reactions_message_user_emoji_unique"
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable("Reactions")
  }
}
