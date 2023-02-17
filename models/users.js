"use strict"
const { Model } = require("sequelize")
const cryptoRandomString = require("crypto-random-string")
module.exports = (sequelize, DataTypes) => {
  class Users extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Users.init(
    {
      username: {
        type: DataTypes.STRING,
        unique: true
      },
      email: {
        type: DataTypes.STRING,
        isUnique: true,
        allowNull: false,
        validate: {
          isEmail: true
        }
      },
      password: {
        type: DataTypes.STRING
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      emailToken: {
        type: DataTypes.STRING
      },
      admin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      avatar: {
        type: DataTypes.STRING
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    },
    {
      sequelize,
      modelName: "Users"
    }
  )
  return Users
}
