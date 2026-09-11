/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE ca1
      FROM \`ChatAssociations\` ca1
      INNER JOIN \`ChatAssociations\` ca2
        ON ca1.\`userId\` = ca2.\`userId\`
        AND ca1.\`chatId\` = ca2.\`chatId\`
        AND ca1.\`id\` > ca2.\`id\`
      `)

    await queryInterface.addConstraint("ChatAssociations", {
      fields: ["userId", "chatId"],
      type: "unique",
      name: "chat_associations_user_chat_unique"
    })
  },
  async down(queryInterface) {
    await queryInterface.removeConstraint(
      "ChatAssociations",
      "chat_associations_user_chat_unique"
    )
  }
}
