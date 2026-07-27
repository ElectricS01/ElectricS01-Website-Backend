/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Sessions")
    await queryInterface.sequelize.query(`
          ALTER TABLE Sessions
          DROP COLUMN expiredAt;
        `)
    await queryInterface.addColumn("Sessions", "expiresAt", {
      allowNull: false,
      type: Sequelize.DATE
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
          ALTER TABLE Sessions
          DROP COLUMN expiresAt;
        `)
    await queryInterface.addColumn("Sessions", "expiredAt", {
      allowNull: true,
      type: Sequelize.STRING
    })
  }
}
