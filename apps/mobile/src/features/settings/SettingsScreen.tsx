// SettingsScreen — v1: delete-my-data flow, no auth.

import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing } from '@styles/theme';
import { ListGroup, ListRow, SectionHeader, Tile } from '@ui';
import { wipeAll } from '@lib/db';
import appConfig from '../../../app.json';

interface SettingsScreenProps {
  onClose?: () => void;
}

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const [isWiping, setIsWiping] = useState(false);

  const handleDeleteMyData = () => {
    Alert.alert(
      'Delete all data?',
      'This removes every sleep entry, habit, path return and preference from this device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            setIsWiping(true);
            try {
              await wipeAll();
              Alert.alert('Done', 'Your data has been erased from this device.');
            } catch (err) {
              console.error('Wipe error:', err);
              Alert.alert('Something went wrong', 'Could not fully erase — please try again.');
            } finally {
              setIsWiping(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <View style={styles.navSide} />
        <Text style={styles.navTitle} accessibilityRole="header">Settings</Text>
        <View style={[styles.navSide, styles.navRight]}>
          {onClose ? (
            <TouchableOpacity onPress={onClose} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.done}>Done</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Privacy" />
        <ListGroup inset={58}>
          <ListRow
            leading={<Tile icon="lock" color={colors.btn} />}
            title="Fully local"
            subtitle="No account, no server, no analytics"
          />
        </ListGroup>
        <Text style={styles.foot}>Compass keeps everything on this device. Nothing leaves it.</Text>

        <SectionHeader title="Your data" />
        <ListGroup>
          <ListRow
            title={isWiping ? 'Deleting…' : 'Delete all my data'}
            tone="destructive"
            trailing={isWiping ? <ActivityIndicator color={colors.error} size="small" /> : undefined}
            onPress={isWiping ? undefined : handleDeleteMyData}
          />
        </ListGroup>
        <Text style={styles.foot}>
          Removes every sleep entry, habit, path return and preference from this device. It cannot be undone.
        </Text>

        <ListGroup style={styles.version}>
          <ListRow title="Version" value={appConfig.expo.version} />
        </ListGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  navSide: { width: 64 },
  navRight: { alignItems: 'flex-end' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: colors.ink },
  done: { fontSize: 17, fontWeight: '600', color: colors.accent },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  foot: { fontSize: 13, color: colors.inkMuted, lineHeight: 18, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  version: { marginTop: spacing.lg },
});
