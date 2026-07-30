import { forwardRef, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { cn } from '@/lib/utils';

interface KeyboardAwareScrollViewProps extends Omit<ScrollViewProps, 'children'> {
  children: ReactNode;
  /** Padding applied to the scroll content. Defaults to 16. */
  contentPadding?: number;
  /** Extra space under the content so the last field clears the keyboard. */
  bottomSpacing?: number;
  /** Offset for any fixed header rendered above this view (iOS). */
  keyboardVerticalOffset?: number;
  className?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Scrollable form body that keeps the focused input visible.
 *
 * Same approach as AuthScaffold (which already works), plus
 * `automaticallyAdjustKeyboardInsets` so iOS scrolls the focused field above the
 * keyboard instead of just shrinking the container.
 */
const KeyboardAwareScrollView = forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  (
    {
      children,
      contentPadding = 16,
      bottomSpacing = 96,
      keyboardVerticalOffset = 0,
      className,
      contentContainerStyle,
      ...props
    },
    ref
  ) => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      className="flex-1"
    >
      <ScrollView
        ref={ref}
        className={cn('flex-1', className)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={[
          { padding: contentPadding, paddingBottom: contentPadding + bottomSpacing },
          contentContainerStyle,
        ]}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
);

KeyboardAwareScrollView.displayName = 'KeyboardAwareScrollView';

export default KeyboardAwareScrollView;
