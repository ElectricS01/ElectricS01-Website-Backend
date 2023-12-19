/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "encryption", {
      allowNull: false,
      defaultValue: "off",
      type: Sequelize.STRING
    })
    await queryInterface.addColumn("Users", "savePrivateKey", {
      allowNull: false,
      defaultValue: false,
      type: Sequelize.BOOLEAN
    })
    await queryInterface.addColumn("Users", "publicKey", {
      type: Sequelize.TEXT
    })
    await queryInterface.addColumn("Users", "privateKey", {
      type: Sequelize.TEXT
    })
  }
}
