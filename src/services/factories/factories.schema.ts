import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import { USER_ROLE } from '../users/users.constants';

export class Factory extends Model<
  InferAttributes<Factory>,
  InferCreationAttributes<Factory>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare address?: string;

  static setup(sequelize: Sequelize) {
    Factory.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        address: DataTypes.STRING,
      },
      {
        sequelize,
        tableName: 'factories',
        underscored: true,
        timestamps: true,
      },
    );
    return Factory;
  }

  static associate(models: any) {
    Factory.hasMany(models.FactoryUser, {
      foreignKey: 'factory_id',
      as: 'members',
    });

    Factory.hasMany(models.Task, {
      foreignKey: 'factory_id',
      as: 'tasks',
    });

    Factory.hasMany(models.Issue, {
      foreignKey: 'factory_id',
      as: 'issues',
    });

    Factory.hasMany(models.Attendance, {
      foreignKey: 'factory_id',
      as: 'attendance',
    });
  }
}

export class FactoryUser extends Model<
  InferAttributes<FactoryUser>,
  InferCreationAttributes<FactoryUser>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare factory_id: string;
  declare role: USER_ROLE;
  declare doj?: Date;

  static setup(sequelize: Sequelize) {
    FactoryUser.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
        },
        factory_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        role: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        doj: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'factory_users',
        underscored: true,
        timestamps: true,
      },
    );
    return FactoryUser;
  }

  static associate(models: any) {
    FactoryUser.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
    });

    FactoryUser.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
      onDelete: 'CASCADE',
    });
  }
}
