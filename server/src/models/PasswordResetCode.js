const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const PasswordResetCode = sequelize.define(
  "PasswordResetCode",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    code_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "code_hash",
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "used_at",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    tableName: "password_reset_codes",
    underscored: false,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false, // No updated_at column
  }
);

module.exports = PasswordResetCode;
