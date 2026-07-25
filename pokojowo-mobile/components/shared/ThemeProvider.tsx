import { useEffect, type ReactNode } from 'react';
import { colorScheme } from 'nativewind';
import useUIStore from '@/stores/uiStore';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Drives NativeWind's color scheme from the persisted `uiStore.theme`
 * preference. Rendering-agnostic: it only synchronizes the scheme so that
 * `dark:` variants and the semantic CSS variables in global.css resolve
 * correctly across the whole tree.
 */
export default function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    // Accepts 'light' | 'dark' | 'system'.
    colorScheme.set(theme);
  }, [theme]);

  return <>{children}</>;
}
