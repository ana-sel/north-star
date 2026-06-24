// Expo's Metro bundler inlines EXPO_PUBLIC_* at build time.
// Declare process.env so TypeScript resolves it without @types/node.
declare const process: {
  readonly env: Record<string, string | undefined>;
};
