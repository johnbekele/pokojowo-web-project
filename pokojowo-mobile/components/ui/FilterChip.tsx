import { TouchableOpacity, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import useTheme from '@/hooks/useTheme';

interface FilterChipProps {
  label: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
}

export default function FilterChip({ label, icon, selected, onPress }: FilterChipProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={cn(
        'flex-row items-center px-3 py-2.5 rounded-full border',
        selected ? 'bg-brand border-brand' : 'bg-card border-border'
      )}
    >
      {icon && <Text className="mr-1.5 text-base">{icon}</Text>}
      <Text
        className={cn('text-sm font-medium', selected ? 'text-brand-fg' : 'text-text')}
      >
        {label}
      </Text>
      {selected && (
        <View className="ml-1.5">
          <Check size={14} color={colors.brandFg} />
        </View>
      )}
    </TouchableOpacity>
  );
}
