/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "DELETE FROM `ChatAssociations` WHERE `userId` NOT IN (SELECT `id` FROM `Users`)"
    )

    await queryInterface.addConstraint("ChatAssociations", {
      fields: ["userId"],
      type: "foreign key",
      name: "chat_associations_user_id_users_id_fk",
      references: {
        field: "id",
        table: "Users"
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    })
  },
  async down(queryInterface) {
    await queryInterface.removeConstraint(
      "ChatAssociations",
      "chat_associations_user_id_users_id_fk"
    )
  }
}
