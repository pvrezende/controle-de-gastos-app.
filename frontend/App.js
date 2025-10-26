import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { ThemeProvider, ThemeContext } from './context/ThemeContext';
import { ActivityIndicator, View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';

import HomeScreen from './screens/HomeScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import PlanningScreen from './screens/PlanningScreen';
import ReportsScreen from './screens/ReportsScreen';
import LoginScreen from './screens/LoginScreen';
import DividasScreen from './screens/DividasScreen';
import RegisterScreen from './screens/RegisterScreen';
import AccountScreen from './screens/AccountScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function AppTabs() {
  const { logout } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Despesas') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Dívidas') iconName = focused ? 'card' : 'card-outline';
          else if (route.name === 'Metas') iconName = focused ? 'star' : 'star-outline';
          else if (route.name === 'Relatórios') iconName = focused ? 'document-text' : 'document-text-outline';
          else if (route.name === 'Conta') iconName = focused ? 'person-circle' : 'person-circle-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={{ marginRight: 15 }}>
            <Ionicons name="log-out-outline" size={24} color="tomato" />
          </TouchableOpacity>
        ),
        tabBarLabelStyle: {
           // Definir fontSize menor para a web
           ...Platform.select({
             web: {
               fontSize: 9, // Tentar com 9
               paddingBottom: 2, // Adicionar um pequeno padding inferior se necessário
             },
             default: {
               // Manter o padrão ou definir um para mobile se quiser
               // fontSize: 10, // Se quiser voltar ao tamanho 10 para mobile
             }
           })
        },
        tabBarStyle: {
            backgroundColor: theme.cardBackground
        },
        headerStyle: {
            backgroundColor: theme.cardBackground
        },
        headerTintColor: theme.text
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Despesas" component={ExpensesScreen} />
      <Tab.Screen name="Dívidas" component={DividasScreen} />
      <Tab.Screen name="Metas" component={PlanningScreen} />
      <Tab.Screen name="Conta" component={AccountScreen} />
      <Tab.Screen name="Relatórios" component={ReportsScreen} />
    </Tab.Navigator>
  );
}

// --- Função AuthStack (sem alterações) ---
function AuthStack() {
  const { theme } = useContext(ThemeContext);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// --- Função AppNav (sem alterações) ---
function AppNav() {
  const { userToken, isLoading } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {userToken !== null ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

// --- StyleSheet ajustado (mantendo a alteração anterior) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({
      web: {
        height: '100%',
      },
    }),
  },
});

// --- Componente App (sem alterações internas) ---
export default function App() {
  return (
    <PaperProvider>
      <ThemeProvider>
        <AuthProvider>
          <View style={styles.container}>
            <AppNav />
          </View>
        </AuthProvider>
      </ThemeProvider>
    </PaperProvider>
  );
}