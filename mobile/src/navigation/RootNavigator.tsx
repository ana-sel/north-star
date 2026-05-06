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
import { CardDetailScreen } from "../screens/CardDetailScreen";
import { GoalsScreen } from "../screens/GoalsScreen";
import { ReviewScreen } from "../screens/ReviewScreen";
import { DiaryScreen } from "../screens/DiaryScreen";
import { HealthScreen } from "../screens/HealthScreen";
import { MoneyScreen } from "../screens/MoneyScreen";
import { FilesScreen } from "../screens/FilesScreen";
import { ProductivityInsightsScreen } from "../screens/ProductivityInsightsScreen";
import { LearningInsightsScreen } from "../screens/LearningInsightsScreen";
import { HealingInsightsScreen } from "../screens/HealingInsightsScreen";
import { ResearchInsightsScreen } from "../screens/ResearchInsightsScreen";
import { EnergyInsightsScreen } from "../screens/EnergyInsightsScreen";
import { HealthInsightsScreen } from "../screens/HealthInsightsScreen";
import { MoneyInsightsScreen } from "../screens/MoneyInsightsScreen";

import { colors } from "../theme";
import type {
  MoreStackParamList,
  RootStackParamList,
  RootTabParamList,
} from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

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
      <MoreStack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ title: "Goals" }}
      />
      <MoreStack.Screen
        name="Review"
        component={ReviewScreen}
        options={{ title: "Review" }}
      />
      <MoreStack.Screen
        name="Diary"
        component={DiaryScreen}
        options={{ title: "Diary" }}
      />
      <MoreStack.Screen
        name="Health"
        component={HealthScreen}
        options={{ title: "Health" }}
      />
      <MoreStack.Screen
        name="Money"
        component={MoneyScreen}
        options={{ title: "Money" }}
      />
      <MoreStack.Screen
        name="Files"
        component={FilesScreen}
        options={{ title: "Files" }}
      />
      <MoreStack.Screen
        name="Productivity"
        component={ProductivityInsightsScreen}
        options={{ title: "Productivity" }}
      />
      <MoreStack.Screen
        name="Learning"
        component={LearningInsightsScreen}
        options={{ title: "Learning" }}
      />
      <MoreStack.Screen
        name="Healing"
        component={HealingInsightsScreen}
        options={{ title: "Healing" }}
      />
      <MoreStack.Screen
        name="Research"
        component={ResearchInsightsScreen}
        options={{ title: "Research" }}
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
      <RootStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      >
        <RootStack.Screen
          name="Tabs"
          component={TabsNavigator}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="CardDetail"
          component={CardDetailScreen}
          options={{ title: "Card", presentation: "modal" }}
        />
        <RootStack.Screen
          name="EnergyInsights"
          component={EnergyInsightsScreen}
          options={{ title: "Energy insights" }}
        />
        <RootStack.Screen
          name="HealthInsights"
          component={HealthInsightsScreen}
          options={{ title: "Health insights" }}
        />
        <RootStack.Screen
          name="MoneyInsights"
          component={MoneyInsightsScreen}
          options={{ title: "Money insights" }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function TabsNavigator() {
  return (
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
  );
}
