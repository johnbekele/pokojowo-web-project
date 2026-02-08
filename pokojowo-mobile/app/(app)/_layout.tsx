import { Redirect, Slot, useRouter } from 'expo-router';
import { View, TouchableOpacity, Text } from 'react-native';
import { Home, Users, MessageSquare, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '@/stores/authStore';

export default function AppLayout() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {/* Custom Tab Bar */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }}>
        <View style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#fff',
          paddingVertical: 8,
        }}>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
            onPress={() => router.push('/(app)/(home)')}
          >
            <Home color="#0d9488" size={24} />
            <Text style={{ fontSize: 12, color: '#0d9488', marginTop: 4 }}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
            onPress={() => router.push('/(app)/(matches)')}
          >
            <Users color="#6b7280" size={24} />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Flatmates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
            onPress={() => router.push('/(app)/(chat)')}
          >
            <MessageSquare color="#6b7280" size={24} />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
            onPress={() => router.push('/(app)/(profile)')}
          >
            <User color="#6b7280" size={24} />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
