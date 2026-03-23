import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class Issue extends Model<
  InferAttributes<Issue>,
  InferCreationAttributes<Issue>
> {
  declare id: CreationOptional<string>;
  declare factory_id: string;
  declare reported_by: string;
  declare message: string;
  declare is_resolved: CreationOptional<boolean>;

  static setup(sequelize: Sequelize) {
    Issue.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        factory_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        reported_by: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        is_resolved: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
      },
      {
        sequelize,
        tableName: 'issues',
        underscored: true,
        timestamps: true,
      },
    );
    return Issue;
  }

  static associate(models: any) {
    Issue.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });

    Issue.belongsTo(models.User, {
      foreignKey: 'reported_by',
      as: 'reporter',
    });
  }
}
