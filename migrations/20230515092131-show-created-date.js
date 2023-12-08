

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "showCreated", {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    })
  }
}
