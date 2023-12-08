

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Messages", "edited", {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    })
  }
}
