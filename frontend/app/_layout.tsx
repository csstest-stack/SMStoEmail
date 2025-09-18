import { Stack } from 'expo-router';
import React from 'react';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="email-config" />
      <Stack.Screen name="filters" />
      <Stack.Screen name="logs" />
      <Stack.Screen name="test-sms" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}