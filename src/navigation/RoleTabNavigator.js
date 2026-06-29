import React from 'react';
import { useAuthStore } from '../store/authStore';
import { isProviderRole, isAdminRole } from '../utils/videoAccess';
import TabNavigator from './TabNavigator';
import ProviderTabNavigator from './ProviderTabNavigator';
import AdminTabNavigator from './AdminTabNavigator';

const RoleTabNavigator = () => {
  const user = useAuthStore((state) => state.user);

  if (isAdminRole(user)) {
    return <AdminTabNavigator />;
  }

  if (isProviderRole(user)) {
    return <ProviderTabNavigator />;
  }

  return <TabNavigator />;
};

export default RoleTabNavigator;
