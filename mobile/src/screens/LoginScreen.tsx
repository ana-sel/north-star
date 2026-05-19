import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { loginApi, registerApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const resp = isRegister
        ? await registerApi(email.trim(), password, displayName.trim() || undefined)
        : await loginApi(email.trim(), password);
      await login(resp.access_token);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>North Star</Text>
      <Text style={styles.subtitle}>
        {isRegister ? "Create account" : "Sign in"}
      </Text>

      {isRegister && (
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="words"
        />
      )}
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        secureTextEntry
      />

      <Pressable
        style={[styles.btn, loading && styles.disabled]}
        disabled={loading}
        onPress={submit}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>
            {isRegister ? "Register" : "Log in"}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => setIsRegister(!isRegister)}>
        <Text style={styles.toggle}>
          {isRegister ? "Already have an account? Sign in" : "No account? Register"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 14,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  disabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  toggle: {
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.lg,
    fontSize: 13,
  },
});
