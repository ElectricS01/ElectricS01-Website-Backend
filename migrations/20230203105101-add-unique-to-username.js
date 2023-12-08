"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Users", "username", {
      type: Sequelize.STRING,
      unique: true
    })
    await queryInterface.changeColumn("Users", "email", {
      type: Sequelize.STRING,
      unique: true
    })
  }
}
