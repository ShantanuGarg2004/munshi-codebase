import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
export class Task extends Model<
  InferAttributes<Task>,
  InferCreationAttributes<Task>
> {
  declare id: CreationOptional<string>;
  declare factory_id: string;
  declare assigned_to: string;
  declare assigned_by: string;
  declare description: string;
  declare deadline?: Date;
  declare is_completed: CreationOptional<boolean>;
  declare batch_id?: string;

  static setup(sequelize: Sequelize) {
    Task.init(
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
        assigned_to: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        assigned_by: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        deadline: DataTypes.DATE,
        is_completed: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        batch_id: DataTypes.UUID,
      },
      {
        sequelize,
        tableName: 'tasks',
        underscored: true,
        timestamps: true,
      },
    );
    return Task;
  }

  static associate(models: any) {
    Task.belongsTo(models.User, { foreignKey: 'assigned_to', as: 'assignee' });
    Task.belongsTo(models.User, { foreignKey: 'assigned_by', as: 'assigner' });
    Task.belongsTo(models.Factory, { foreignKey: 'factory_id', as: 'factory' });

    Task.hasMany(models.TaskUpdate, { foreignKey: 'task_id', as: 'updates' });
  }
}

export class TaskUpdate extends Model<
  InferAttributes<TaskUpdate>,
  InferCreationAttributes<TaskUpdate>
> {
  declare id: CreationOptional<string>;
  declare task_id: string;
  declare user_id: string;
  declare message: string;

  static setup(sequelize: Sequelize) {
    TaskUpdate.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        task_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'task_updates',
        underscored: true,
        timestamps: true,
      },
    );
    return TaskUpdate;
  }

  static associate(models: any) {
    TaskUpdate.belongsTo(models.Task, {
      foreignKey: 'task_id',
      as: 'task',
      onDelete: 'CASCADE',
    });

    TaskUpdate.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
  }
}
