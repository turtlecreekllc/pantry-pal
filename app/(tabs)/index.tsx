/**
 * Index Route - Redirects to Tonight Screen
 * 
 * In Expo Router, index.tsx is the default route for a folder.
 * We redirect to the Tonight screen which is the new home per the PRD.
 */

import { Redirect } from 'expo-router';

export default function IndexRedirect(): React.ReactElement {
  return <Redirect href="/(tabs)/tonight" />;
}
