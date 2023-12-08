

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "tetris", {
      type: Sequelize.STRING
    })
    await queryInterface.addColumn("Users", "tonkGame", {
      type: Sequelize.STRING
    })
  }
}
