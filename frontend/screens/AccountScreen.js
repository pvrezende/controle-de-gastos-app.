// frontend/screens/AccountScreen.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    ActivityIndicator, 
    RefreshControl, 
    TouchableOpacity, 
    Modal, 
    TextInput, 
    Alert,
    Platform,
    Dimensions
} from 'react-native';
import { 
    Card, 
    Button, 
    Title, 
    Paragraph, 
    IconButton, 
    Surface, 
    Avatar, 
    Divider, 
    Switch 
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * TELA: AccountScreen
 * Objetivo: Gestão de perfil, segurança de acesso e preferências visuais.
 * Inclui o alternador de Modo Escuro / Claro.
 */
export default function AccountScreen({ navigation }) {
    const { api, deleteAccount } = useContext(AuthContext);
    const { theme, isDarkTheme, toggleTheme } = useContext(ThemeContext);
    
    // Estados de Controle de Dados do Perfil
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Estados para Controle dos Modais
    const [rendaModalVisible, setRendaModalVisible] = useState(false);
    const [inputRenda, setInputRenda] = useState('');
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    /**
     * fetchData: Sincroniza os dados do usuário com o servidor AWS RDS.
     * Necessário para refletir mudanças na renda mensal.
     */
    const fetchData = async () => {
        try {
            setRefreshing(true);
            const response = await api.get('/usuario');
            setUserData(response.data);
            setInputRenda(String(response.data.renda_mensal));
        } catch (error) {
            console.error('Erro na carga do perfil:', error);
            Alert.alert('Erro de Conexão', 'Não foi possível carregar os dados do seu perfil no momento.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    
    useFocusEffect(useCallback(() => { fetchData(); }, []));

    const onRefresh = () => fetchData();

    /**
     * handleUpdateRenda: Atualiza o valor base da renda mensal do usuário.
     */
    const handleUpdateRenda = async () => {
        const valorLimpo = inputRenda.replace(',', '.');
        const novaRendaNum = parseFloat(valorLimpo);

        if (isNaN(novaRendaNum) || novaRendaNum < 0) {
            Alert.alert('Valor Inválido', 'Por favor, insira um valor numérico positivo para sua renda.');
            return;
        }
        try {
            await api.put('/usuario', { renda_mensal: novaRendaNum });
            Alert.alert('Perfil Atualizado', 'Sua renda mensal foi gravada com sucesso!');
            setRendaModalVisible(false);
            fetchData();
        } catch (error) {
            Alert.alert('Erro no Servidor', 'Houve um problema ao salvar sua nova renda. Tente novamente.');
        }
    };

    /**
     * handleUpdatePassword: Altera a credencial de acesso com validações de segurança.
     */
    const handleUpdatePassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Campos Vazios', 'Para sua segurança, preencha todos os campos de senha.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Erro de Digitação', 'A confirmação de senha não coincide com a nova senha.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Senha Fraca', 'Sua nova senha deve possuir pelo menos 6 caracteres.');
            return;
        }

        try {
            await api.put('/usuario/senha', { newPassword });
            Alert.alert('Segurança Atualizada', 'Sua senha de acesso foi alterada. Use-a no próximo login.');
            setPasswordModalVisible(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            Alert.alert('Erro de Processamento', 'Não foi possível atualizar sua senha. Verifique sua conexão.');
        }
    };

    /**
     * handleDeleteAccount: Lógica de encerramento definitivo de conta.
     */
    const handleDeleteAccount = () => {
        Alert.alert(
            "AVISO DE EXCLUSÃO",
            "Você está prestes a apagar todos os seus registros financeiros (gastos, metas e dívidas). Esta ação é permanente e irreversível.",
            [
                { text: "Cancelar e Voltar", style: "cancel" },
                {
                    text: "APAGAR TUDO AGORA",
                    onPress: async () => {
                        try {
                            await deleteAccount();
                        } catch (error) {
                            Alert.alert('Erro Crítico', 'Falha ao processar o encerramento da conta.');
                        }
                    },
                    style: "destructive"
                }
            ]
        );
    };

    // Estilos internos que garantem a legibilidade e o design premium
    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        header: { padding: 40, borderBottomLeftRadius: 45, borderBottomRightRadius: 45, alignItems: 'center' },
        avatar: { backgroundColor: theme.primary, elevation: 6 },
        username: { fontSize: 30, fontWeight: 'bold', marginTop: 15 },
        scroll: { padding: 22, paddingBottom: 120 },
        sectionLabel: { fontSize: 13, fontWeight: 'bold', color: theme.subText, marginBottom: 12, marginLeft: 8, letterSpacing: 1.5 },
        mainCard: { 
            marginBottom: 20, 
            borderRadius: 26, 
            elevation: 5, 
            backgroundColor: theme.cardBackground,
            borderLeftWidth: 12,
            borderLeftColor: theme.primary,
            overflow: 'hidden'
        },
        cardHeader: { fontSize: 12, fontWeight: '600', color: theme.subText },
        cardValue: { fontSize: 24, fontWeight: '900', color: theme.text },
        flexRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        themeSurface: { 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: 18, 
            borderRadius: 25, 
            backgroundColor: isDarkTheme ? '#2c2c2c' : '#f8f8f8',
            marginBottom: 28,
            borderWidth: 1,
            borderColor: theme.subText + '25'
        },
        dangerBtn: { marginTop: 15, borderRadius: 18, borderColor: theme.danger, height: 50, justifyContent: 'center' },
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 25 },
        modalBox: { padding: 35, borderRadius: 35, backgroundColor: theme.cardBackground },
        input: { 
            borderWidth: 1, 
            borderRadius: 16, 
            padding: 18, 
            marginBottom: 16, 
            color: theme.text, 
            borderColor: theme.subText,
            backgroundColor: isDarkTheme ? '#202020' : '#fff',
            fontSize: 16
        },
        passWrapper: { position: 'relative', justifyContent: 'center' },
        passIcon: { position: 'absolute', right: 8, zIndex: 5 },
        rowGap: { flexDirection: 'row', gap: 15, marginTop: 20 }
    });

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ color: theme.subText, marginTop: 15 }}>Sincronizando perfil...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* TOPO DA PÁGINA COM AVATAR */}
            <Surface style={[styles.header, { backgroundColor: isDarkTheme ? '#1a1a1a' : '#ffffff' }]} elevation={3}>
                <Avatar.Text 
                    size={85} 
                    label={userData?.username?.substring(0, 2).toUpperCase()} 
                    style={styles.avatar} 
                    color="white" 
                />
                <Title style={[styles.username, { color: theme.text }]}>{userData?.username}</Title>
                <Paragraph style={{ color: theme.subText }}>Membro desde {new Date().getFullYear()}</Paragraph>
            </Surface>

            <ScrollView 
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.text} />}
            >
                {/* CONFIGURAÇÃO DE TEMA [NOVA FUNCIONALIDADE] */}
                <Text style={styles.sectionLabel}>APARÊNCIA DO SISTEMA</Text>
                <Surface style={styles.themeSurface} elevation={2}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Avatar.Icon 
                            size={44} 
                            icon={isDarkTheme ? "moon-waning-crescent" : "white-balance-sunny"} 
                            color={isDarkTheme ? "#BB86FC" : "#FFA000"} 
                            style={{ backgroundColor: isDarkTheme ? '#BB86FC20' : '#FFA00020' }} 
                        />
                        <View style={{ marginLeft: 15 }}>
                            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 17 }}>Modo {isDarkTheme ? 'Escuro' : 'Claro'}</Text>
                            <Text style={{ color: theme.subText, fontSize: 12 }}>Ativar fundo {isDarkTheme ? 'preto' : 'claro'}</Text>
                        </View>
                    </View>
                    <Switch value={isDarkTheme} onValueChange={toggleTheme} color={theme.primary} />
                </Surface>

                {/* INFORMAÇÕES FINANCEIRAS */}
                <Text style={styles.sectionLabel}>DADOS FINANCEIROS</Text>
                <Card style={styles.mainCard}>
                    <Card.Content>
                        <View style={styles.flexRowBetween}>
                            <View>
                                <Text style={styles.cardHeader}>RENDA MENSAL ATUAL</Text>
                                <Text style={styles.cardValue}>R$ {Number(userData?.renda_mensal || 0).toFixed(2)}</Text>
                            </View>
                            <IconButton 
                                icon="cash-edit" 
                                size={30} 
                                iconColor={theme.primary} 
                                onPress={() => setRendaModalVisible(true)} 
                                style={{ backgroundColor: theme.primary + '18' }}
                            />
                        </View>
                    </Card.Content>
                </Card>

                {/* SEGURANÇA E CONTA */}
                <Text style={styles.sectionLabel}>SEGURANÇA</Text>
                <Card style={[styles.mainCard, { borderLeftColor: '#4CAF50' }]}>
                    <Card.Content>
                        <View style={styles.flexRowBetween}>
                            <View>
                                <Text style={styles.cardHeader}>CREDENCIAIS DE ACESSO</Text>
                                <Text style={styles.cardValue}>••••••••••••</Text>
                            </View>
                            <IconButton 
                                icon="lock-check" 
                                size={30} 
                                iconColor="#4CAF50" 
                                onPress={() => setPasswordModalVisible(true)} 
                                style={{ backgroundColor: '#4CAF5018' }}
                            />
                        </View>
                    </Card.Content>
                </Card>

                <Divider style={{ marginVertical: 15, height: 1 }} />

                {/* BOTÃO DE EXCLUSÃO */}
                <Button 
                    mode="outlined" 
                    onPress={handleDeleteAccount} 
                    style={styles.dangerBtn} 
                    textColor={theme.danger}
                    icon="account-remove-outline"
                >
                    Excluir minha conta permanentemente
                </Button>

                {/* MODAL: EDIÇÃO DE RENDA */}
                <Modal visible={rendaModalVisible} transparent animationType="fade" onRequestClose={() => setRendaModalVisible(false)}>
                    <View style={styles.overlay}>
                        <Surface style={styles.modalBox} elevation={5}>
                            <Title style={{ color: theme.text, textAlign: 'center', marginBottom: 25 }}>Atualizar Renda</Title>
                            <TextInput 
                                style={styles.input} 
                                keyboardType="numeric" 
                                value={inputRenda} 
                                onChangeText={setInputRenda}
                                placeholder="0.00"
                                placeholderTextColor={theme.subText}
                            />
                            <View style={styles.rowGap}>
                                <Button mode="outlined" onPress={() => setRendaModalVisible(false)} style={{ flex: 1 }}>Voltar</Button>
                                <Button mode="contained" onPress={handleUpdateRenda} style={{ flex: 1 }}>Salvar</Button>
                            </View>
                        </Surface>
                    </View>
                </Modal>
                
                {/* MODAL: TROCA DE SENHA */}
                <Modal visible={passwordModalVisible} transparent animationType="slide" onRequestClose={() => setPasswordModalVisible(false)}>
                    <View style={styles.overlay}>
                        <Surface style={styles.modalBox} elevation={5}>
                            <Title style={{ color: theme.text, textAlign: 'center', marginBottom: 25 }}>Alterar Senha</Title>
                            
                            <View style={styles.passWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nova senha de acesso"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!isPasswordVisible}
                                    placeholderTextColor={theme.subText}
                                />
                                <IconButton 
                                    icon={isPasswordVisible ? "eye-off" : "eye"} 
                                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                    style={styles.passIcon}
                                    iconColor={theme.subText}
                                />
                            </View>

                            <TextInput
                                style={styles.input}
                                placeholder="Confirme a nova senha"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!isPasswordVisible}
                                placeholderTextColor={theme.subText}
                            />

                            <View style={styles.rowGap}>
                                <Button mode="text" onPress={() => setPasswordModalVisible(false)} textColor={theme.danger} style={{ flex: 1 }}>Cancelar</Button>
                                <Button mode="contained" onPress={handleUpdatePassword} style={{ flex: 1 }}>Atualizar</Button>
                            </View>
                        </Surface>
                    </View>
                </Modal>
            </ScrollView>
        </View>
    );
}
