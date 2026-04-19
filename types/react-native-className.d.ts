/**
 * Type augmentation to allow `className` prop on React Native components.
 *
 * React Native Web supports `className` for CSS styling on web targets.
 * NativeWind (Tailwind for React Native) also uses `className`.
 *
 * This declaration prevents TypeScript errors when passing `className`
 * to React Native components in a web-enabled project.
 */

import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface TouchableHighlightProps {
    className?: string;
  }
  interface TouchableNativeFeedbackProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
  interface FlatListProps<ItemT> {
    className?: string;
  }
  interface SectionListProps<ItemT, SectionT> {
    className?: string;
  }
}
