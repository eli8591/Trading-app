import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Dashboard: undefined;
  LogTrade: undefined;
  History: undefined;
  Accounts: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  AddAccount: { accountId?: string } | undefined;
};
