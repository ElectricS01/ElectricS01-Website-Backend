"use strict"
const { Model } = require("sequelize")
module.exports = (sequelize, DataTypes) => {
  class Friends extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Friends.belongsTo(models.Users, {
        foreignKey: "userId",
        as: "user"
      })
      Friends.belongsTo(models.Users, {
        foreignKey: "friendId",
        as: "user2"
      })
    }
  }
  Friends.init(
    {
      userId: DataTypes.INTEGER,
      friendId: DataTypes.INTEGER,
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending"
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      modelName: "Friends"
    }
  )
  return Friends
}
