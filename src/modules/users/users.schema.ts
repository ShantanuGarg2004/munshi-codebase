 
import {
  Model,
  DataTypes,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { USER_ROLE } from 'src/core/constants/user.constants'; 

export class UserModel extends Model<
  InferAttributes<UserModel>,
  InferCreationAttributes<UserModel>
> {
  declare id: CreationOptional<string>;
  declare name?: string;
  declare phone_number: string;
  declare profile_picture?: string;
  declare role: CreationOptional<USER_ROLE>;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  static setup(sequelize: Sequelize) {
    UserModel.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        phone_number: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: true,
          unique: false,
        },

        profile_picture: {
          type: DataTypes.STRING,
          allowNull: true,
          unique: false,
        },

        role: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: USER_ROLE.AUTHENTICATED,
          validate: {
            isIn: [Object.values(USER_ROLE)],
          },
        },
      },
      {
        sequelize,
        tableName: 'users',
        modelName: 'UserModel',
        timestamps: true,
      },
    );

    return UserModel;
  }
}

 