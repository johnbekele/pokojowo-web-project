import { TouchableOpacity, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS } from '@/lib/constants';

interface FilterChipProps {
  label: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
}

export default function FilterChip({ label, icon, selected, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`flex-row items-center px-3 py-2.5 rounded-full border-2 ${
        selected
          ? 'bg-primary-600 border-primary-600'
          : 'bg-white border-gray-200'
      }`}
    >
      {icon && <Text className="mr-1.5 text-base">{icon}</Text>}
      <Text
        className={`text-sm font-medium ${
          selected ? 'text-white' : 'text-gray-700'
        }`}
      >
        {label}
      </Text>
      {selected && (
        <View className="ml-1.5">
          <Check size={14} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
}
