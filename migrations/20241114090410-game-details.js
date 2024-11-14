/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "gameName", {
      type: Sequelize.STRING
    })
    await queryInterface.addColumn("Users", "playingSince", {
      type: Sequelize.DATE
    })
  }
}
