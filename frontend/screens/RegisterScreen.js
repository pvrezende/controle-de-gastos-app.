// frontend/screens/RegisterScreen.js

import React, { useState, useContext, useRef, useEffect } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    StyleSheet, 
    Alert, 
    ActivityIndicator, 
    TouchableOpacity, 
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { 
    Button, 
    Surface, 
    Avatar, 
    IconButton, 
    Title, 
    Paragraph 
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

/**
 * TELA: RegisterScreen
 * Finalidade: Criação de novos usuários integrados ao banco RDS AWS.
 * Design: Unificado com bordas laterais coloridas e suporte total ao Modo Black.
 */
export default function RegisterScreen({ navigation }) {
    // Estados do Formulário de Cadastro
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Estados de Foco para Estilização Dinâmica (Fim do fundo branco)
    const [isUserFocused, setIsUserFocused] = useState(false);
    const [isPassFocused, setIsPassFocused] = useState(false);
    const [isConfirmFocused, setIsConfirmFocused] = useState(false);

    // Contextos Globais de Autenticação e Tema
    const { register } = useContext(AuthContext);
    const { theme, isDarkTheme, toggleTheme } = useContext(ThemeContext);

    // Animação de entrada suave
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    /**
     * handleRegister: Valida campos e envia dados para criação de conta.
     */
    const handleRegister = async () => {
        // Validações básicas de formulário
        if (!username.trim() || !password || !confirmPassword) {
            Alert.alert('Dados Incompletos', 'Preencha todos os campos para criar sua conta.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Erro na Senha', 'As senhas digitadas não coincidem.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Senha Curta', 'Para sua segurança, use uma senha com pelo menos 6 caracteres.');
            return;
        }

        setIsLoading(true);
        try {
            // Chamada ao AuthContext para registro no backend RDS
            await register(username.trim(), password);
            // O sistema realiza login automático após cadastro com sucesso
        } catch (error) {
            const errorMessage = error.response?.data || 'Erro ao conectar com o servidor.';
            Alert.alert('Falha no Cadastro', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Estilos Dinâmicos que respeitam o Tema e eliminam brilhos indesejados
    const styles = StyleSheet.create({
        container: { 
            flex: 1, 
            backgroundColor: theme.background 
        },
        togglePosition: {
            position: 'absolute',
            top: 50,
            right: 20,
            zIndex: 10
        },
        scrollContent: { 
            flexGrow: 1, 
            justifyContent: 'center', 
            padding: 25 
        },
        headerArea: { 
            alignItems: 'center', 
            marginBottom: 35 
        },
        avatarLogo: { 
            backgroundColor: theme.primary, 
            elevation: 8,
            marginBottom: 15
        },
        titleText: { 
            fontSize: 28, 
            fontWeight: '900', 
            color: theme.text,
            textAlign: 'center'
        },
        subtitleText: { 
            color: theme.subText, 
            fontSize: 13, 
            textAlign: 'center',
            letterSpacing: 0.5,
            marginTop: 5
        },
        registerCard: {
            padding: 25,
            borderRadius: 35,
            backgroundColor: theme.cardBackground,
            elevation: 12,
            borderLeftWidth: 10,
            borderLeftColor: theme.primary, // Borda Premium igual ao Login
            marginBottom: 20
        },
        fieldLabel: {
            fontSize: 11,
            fontWeight: 'bold',
            color: theme.subText,
            marginBottom: 6,
            marginLeft: 4,
            textTransform: 'uppercase'
        },
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 2,
            borderRadius: 15,
            paddingHorizontal: 12,
            height: 55,
            marginBottom: 15,
            backgroundColor: isDarkTheme ? '#1e1e1e' : '#f9f9f9',
            borderColor: theme.subText + '25'
        },
        inputActive: {
            borderColor: theme.primary,
            backgroundColor: isDarkTheme ? '#252525' : '#fff'
        },
        textInput: {
            flex: 1,
            color: theme.text,
            fontSize: 15,
            marginLeft: 8
        },
        submitButton: {
            height: 52,
            borderRadius: 15,
            justifyContent: 'center',
            marginTop: 15,
            elevation: 2
        },
        backLink: {
            marginTop: 20,
            alignItems: 'center'
        },
        accentText: {
            color: theme.secondary,
            fontWeight: 'bold'
        },
        loadingBox: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100
        }
    });

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* ALTERNADOR DE TEMA NO TOPO */}
            <View style={styles.togglePosition}>
                <IconButton 
                    icon={isDarkTheme ? "weather-sunny" : "moon-waning-crescent"} 
                    iconColor={isDarkTheme ? "#FBC02D" : theme.text}
                    size={26}
                    onPress={toggleTheme}
                    style={{ backgroundColor: theme.cardBackground }}
                />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ opacity: fadeAnim }}>
                    
                    {/* CABEÇALHO DE BOAS-VINDAS */}
                    <View style={styles.headerArea}>
                        <Avatar.Icon 
                            size={80} 
                            icon="account-plus" 
                            style={styles.avatarLogo} 
                            color="white" 
                        />
                        <Title style={styles.titleText}>Nova Conta</Title>
                        <Paragraph style={styles.subtitleText}>COMECE A ORGANIZAR SUA VIDA FINANCEIRA</Paragraph>
                    </View>

                    {/* CARD PRINCIPAL DE CADASTRO */}
                    <Surface style={styles.registerCard}>
                        
                        {/* INPUT: USUÁRIO */}
                        <Text style={styles.fieldLabel}>Nome de Usuário</Text>
                        <View style={[styles.inputContainer, isUserFocused && styles.inputActive]}>
                            <MaterialCommunityIcons name="account-outline" size={22} color={isUserFocused ? theme.primary : theme.subText} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Como quer ser chamado?"
                                placeholderTextColor={theme.subText}
                                value={username}
                                onChangeText={setUsername}
                                onFocus={() => setIsUserFocused(true)}
                                onBlur={() => setIsUserFocused(false)}
                                autoCapitalize="none"
                            />
                        </View>

                        {/* INPUT: SENHA */}
                        <Text style={styles.fieldLabel}>Escolha uma Senha</Text>
                        <View style={[styles.inputContainer, isPassFocused && styles.inputActive]}>
                            <MaterialCommunityIcons name="key-outline" size={22} color={isPassFocused ? theme.primary : theme.subText} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Mínimo 6 caracteres"
                                placeholderTextColor={theme.subText}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!isPasswordVisible}
                                onFocus={() => setIsPassFocused(true)}
                                onBlur={() => setIsPassFocused(false)}
                            />
                        </View>

                        {/* INPUT: CONFIRMAÇÃO */}
                        <Text style={styles.fieldLabel}>Confirme sua Senha</Text>
                        <View style={[styles.inputContainer, isConfirmFocused && styles.inputActive]}>
                            <MaterialCommunityIcons name="shield-check-outline" size={22} color={isConfirmFocused ? theme.primary : theme.subText} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Repita a senha"
                                placeholderTextColor={theme.subText}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!isPasswordVisible}
                                onFocus={() => setIsConfirmFocused(true)}
                                onBlur={() => setIsConfirmFocused(false)}
                            />
                            <IconButton 
                                icon={isPasswordVisible ? "eye-off" : "eye"} 
                                iconColor={theme.subText}
                                size={18}
                                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                            />
                        </View>

                        {/* BOTÃO DE SUBMISSÃO */}
                        <Button 
                            mode="contained" 
                            onPress={handleRegister} 
                            style={styles.submitButton}
                            labelStyle={{ fontWeight: 'bold', fontSize: 15 }}
                            buttonColor={theme.primary}
                        >
                            CRIAR MINHA CONTA
                        </Button>

                        {/* LINK PARA LOGIN */}
                        <TouchableOpacity 
                            style={styles.backLink} 
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={{ color: theme.text, fontSize: 13 }}>
                                Já possui acesso? <Text style={styles.accentText}>Fazer Login</Text>
                            </Text>
                        </TouchableOpacity>
                    </Surface>

                    {/* FOOTER */}
                    <Text style={{ textAlign: 'center', color: theme.subText, marginTop: 20, fontSize: 10 }}>
                        Privacidade e segurança garantida via RDS AWS
                    </Text>
                </Animated.View>
            </ScrollView>

            {/* OVERLAY DE CARREGAMENTO (ESTILO PREMIUM) */}
            {isLoading && (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={{ color: 'white', marginTop: 15, fontWeight: 'bold' }}>Processando seu cadastro...</Text>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}
