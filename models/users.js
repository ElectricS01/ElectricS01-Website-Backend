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
      Users.hasOne(models.Friends, {
        foreignKey: "friendId",
        as: "friend"
      })
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
      banner: {
        type: DataTypes.STRING
      },
      description: {
        type: DataTypes.TEXT
      },
      directMessages: {
        type: DataTypes.STRING
      },
      friendRequests: {
        type: DataTypes.BOOLEAN
      },
      status: {
        type: DataTypes.STRING
      },
      statusMessage: {
        type: DataTypes.STRING
      },
      friendStatus: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.friend?.status
        }
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
