import { UserModel } from 'src/modules/users/users.schema';

export const MONGOOSE_MODELS = {

};

export const SQL_MODELS = {
  UserModel: UserModel.setup,
};
