import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ChatScreen } from "../screens/ChatScreen";
import { TodayScreen } from "../screens/TodayScreen";
import { BoardsScreen } from "../screens/BoardsScreen";
import { HabitsScreen } from "../screens/HabitsScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { ApprovalsListScreen } from "../screens/ApprovalsListScreen";
import { ApprovalDetailScreen } from "../screens/ApprovalDetailScreen";

import { colors } from "../theme";
import type { MoreStackParamList, RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    border: colors.border,
    text: colors.text,
    primary: colors.primary,
  },
};

function MoreNavigator() {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <MoreStack.Screen
        name="MoreHome"
        component={MoreScreen}
        options={{ headerShown: false }}
      />
      <MoreStack.Screen
        name="ApprovalsList"
        component={ApprovalsListScreen}
        options={{ title: "Approvals" }}
      />
      <MoreStack.Screen
        name="ApprovalDetail"
        component={ApprovalDetailScreen}
        options={{ title: "Review", presentation: "modal" }}
      />
    </MoreStack.Navigator>
  );
}

/**
 * Bottom tabs per spec §3 / §9: Chat | Today | Boards | Habits | More.
 */
export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          tabBarStyle: { backgroundColor: colors.surface },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Today" component={TodayScreen} />
        <Tab.Screen name="Boards" component={BoardsScreen} />
        <Tab.Screen name="Habits" component={HabitsScreen} />
        <Tab.Screen
          name="More"
          component={MoreNavigator}
          options={{ headerShown: false }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
