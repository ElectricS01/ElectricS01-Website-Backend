"use strict"
const { Model } = require("sequelize")
module.exports = (sequelize, DataTypes) => {
  class Chats extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Chats.belongsTo(models.Users, {
        as: "user",
        foreignKey: "owner"
      })
    }
  }
  Chats.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false
      },
      icon: {
        type: DataTypes.STRING
      },
      owner: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      requireVerification: {
        type: DataTypes.BOOLEAN,
        allowNull: false
      },
      latest: {
        type: DataTypes.DATE,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "Chats"
    }
  )
  return Chats
}
