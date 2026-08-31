/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("EncryptedMessageKeys", {
      messageId: {
        allowNull: false,
        primaryKey: true,
        references: {
          model: "Messages",
          key: "id"
        },
        onDelete: "CASCADE",
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "Users",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      encryptedMessageKey: {
        type: Sequelize.BLOB,
        allowNull: false
      },
      nonce: {
        type: Sequelize.BLOB,
        allowNull: false
      }
    })

    await queryInterface.addColumn("Messages", "ciphertext", {
      type: Sequelize.BLOB,
      allowNull: true
    })

    await queryInterface.addColumn("Messages", "nonce", {
      type: Sequelize.BLOB,
      allowNull: true
    })

    await queryInterface.changeColumn("Messages", "messageContents", {
      type: Sequelize.TEXT,
      allowNull: true
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("EncryptedMessageKeys")
    await queryInterface.removeColumn("Messages", "ciphertext")
    await queryInterface.removeColumn("Messages", "nonce")
    await queryInterface.changeColumn("Messages", "messageContents", {
      type: Sequelize.TEXT,
      allowNull: false
    })
  }
}
