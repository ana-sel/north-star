import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { initNotifications } from "./src/services/notifications";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { LoginScreen } from "./src/screens/LoginScreen";

function AppInner() {
  const { token, loading } = useAuth();

  useEffect(() => {
    initNotifications();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#faf4ec" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return token ? <RootNavigator /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppInner />
      </SafeAreaProvider>
    </AuthProvider>
  );
}

