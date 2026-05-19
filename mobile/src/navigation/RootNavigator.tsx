import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ChatScreen } from "../screens/ChatScreen";
import { TodayScreen } from "../screens/TodayScreen";
import { PlanScreen } from "../screens/PlanScreen";
import { TrackScreen } from "../screens/TrackScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { ApprovalsListScreen } from "../screens/ApprovalsListScreen";
import { ApprovalDetailScreen } from "../screens/ApprovalDetailScreen";
import { CardDetailScreen } from "../screens/CardDetailScreen";
import { GoalsScreen } from "../screens/GoalsScreen";
import { ReviewScreen } from "../screens/ReviewScreen";
import { DiaryScreen } from "../screens/DiaryScreen";
import { FilesScreen } from "../screens/FilesScreen";
import { ProductivityInsightsScreen } from "../screens/ProductivityInsightsScreen";
import { LearningInsightsScreen } from "../screens/LearningInsightsScreen";
import { HealingInsightsScreen } from "../screens/HealingInsightsScreen";
import { ResearchInsightsScreen } from "../screens/ResearchInsightsScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { CompassScreen } from "../screens/CompassScreen";
import { MissionEditorScreen } from "../screens/MissionEditorScreen";
import { AuditLogsScreen } from "../screens/AuditLogsScreen";
import { AIBudgetScreen } from "../screens/AIBudgetScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { WearablesImportScreen } from "../screens/WearablesImportScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

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
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
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
        name="Compass"
        component={CompassScreen}
        options={{ title: "Life Compass" }}
      />
      <MoreStack.Screen
        name="MissionEditor"
        component={MissionEditorScreen}
        options={{ title: "Mission Editor" }}
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
        name="Files"
        component={FilesScreen}
        options={{ title: "Files" }}
      />
      <MoreStack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: "Search" }}
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
      <MoreStack.Screen
        name="AuditLogs"
        component={AuditLogsScreen}
        options={{ title: "AI Audit Logs" }}
      />
      <MoreStack.Screen
        name="AIBudget"
        component={AIBudgetScreen}
        options={{ title: "AI Budget" }}
      />
      <MoreStack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: "Calendar" }}
      />
      <MoreStack.Screen
        name="WearablesImport"
        component={WearablesImportScreen}
        options={{ title: "Wearables" }}
      />
      <MoreStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </MoreStack.Navigator>
  );
}

/**
 * Bottom tabs per spec §9: Chat | Today | Plan | Track | More.
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
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Plan" component={PlanScreen} />
      <Tab.Screen name="Track" component={TrackScreen} />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}
