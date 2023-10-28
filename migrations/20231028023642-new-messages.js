"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ChatAssociations", "lastRead", {
      allowNull: false,
      type: Sequelize.INTEGER,
      defaultValue: -1
    })
  }
}
