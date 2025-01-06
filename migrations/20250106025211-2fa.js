/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "otpVerified", {
      allowNull: false,
      defaultValue: false,
      type: Sequelize.BOOLEAN
    })
    await queryInterface.addColumn("Users", "otpSecret", {
      type: Sequelize.STRING
    })
  }
}
