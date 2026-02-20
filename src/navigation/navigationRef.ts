/**
 * Shared navigation ref — allows navigating from outside React components.
 *
 * Used by App.tsx to handle notification deep-links.
 * Attached to NavigationContainer in RootStack.tsx via the ref prop.
 */

import { createRef } from "react";
import type { NavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./RootStack";

export const navigationRef =
  createRef<NavigationContainerRef<RootStackParamList>>();
