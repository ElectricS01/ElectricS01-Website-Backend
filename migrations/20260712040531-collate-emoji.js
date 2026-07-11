/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Reactions", "emoji", {
      allowNull: false,
      charset: "utf8mb4",
      collate: "utf8mb4_bin",
      type: Sequelize.STRING
    })
  }
}
