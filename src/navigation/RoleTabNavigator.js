import React from 'react';
import { useAuthStore } from '../store/authStore';
import { isProviderRole } from '../utils/videoAccess';
import TabNavigator from './TabNavigator';
import ProviderTabNavigator from './ProviderTabNavigator';

const RoleTabNavigator = () => {
  const user = useAuthStore((state) => state.user);

  if (isProviderRole(user)) {
    return <ProviderTabNavigator />;
  }

  return <TabNavigator />;
};

export default RoleTabNavigator;
