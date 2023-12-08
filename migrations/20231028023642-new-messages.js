/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ChatAssociations", "lastRead", {
      allowNull: false,
      defaultValue: -1,
      type: Sequelize.INTEGER
    })
  }
}
