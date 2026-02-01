// frontend/screens/HomeScreen.js
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
    ProgressBar, 
    Button, 
    Title, 
    Paragraph, 
    IconButton, 
    Surface, 
    Avatar, 
    Divider 
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

/**
 * CONFIGURAÇÕES DE DISPOSITIVO
 * Utilizado para cálculos de layout responsivo e redimensionamento de cards.
 */
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * TELA: HomeScreen
 * Descrição: Central de comando financeiro.
 * Atualização: Reinclusão do botão de Sair e integração com Economia Inteligente.
 */
export default function HomeScreen({ navigation }) {
    const { api, userToken, logout } = useContext(AuthContext); // logout reintegrado para o cabeçalho
    const { theme, isDarkTheme } = useContext(ThemeContext); 
    
    // ==========================================
    // 1. ESTADOS DE CONTROLE DE DADOS
    // ==========================================
    const [rendaMensal, setRendaMensal] = useState(0);
    const [despesasPagasMes, setDespesasPagasMes] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [username, setUsername] = useState('');

    // ==========================================
    // 2. ESTADOS DE GASTOS E ALERTAS
    // ==========================================
    const [upcomingExpenses, setUpcomingExpenses] = useState([]);
    const [overdueExpenses, setOverdueExpenses] = useState([]);
    const [debtSavingsGoals, setDebtSavingsGoals] = useState({ daily: 0, monthly: 0 });
    const [goalSavings, setGoalSavings] = useState({ daily: 0, monthly: 0 });
    const [homeDividas, setHomeDividas] = useState([]);
    const [homeMetas, setHomeMetas] = useState([]);

    // ==========================================
    // 3. ESTADOS DE RENDA EXTRA
    // ==========================================
    const [rendasExtras, setRendasExtras] = useState([]);
    const [totalRendasExtras, setTotalRendasExtras] = useState(0);

    // ==========================================
    // 4. ESTADOS DE MODAIS E FORMULÁRIOS
    // ==========================================
    const [rendaModalVisible, setRendaModalVisible] = useState(false);
    const [inputRenda, setInputRenda] = useState('');
    const [addRendaExtraModalVisible, setAddRendaExtraModalVisible] = useState(false);
    const [newRendaExtra, setNewRendaExtra] = useState({ nome: '', valor: '', data_recebimento: new Date() });
    const [showDatePicker, setShowDatePicker] = useState(false);

    /**
     * fetchData: Sincroniza o Dashboard com o RDS AWS e calcula o comprometimento orçamentário.
     */
    const fetchData = async () => {
        try {
            setRefreshing(true);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const mesAtual = hoje.getMonth() + 1;
            const anoAtual = hoje.getFullYear();

            // Chamada paralela otimizada para reduzir latência na AWS
            const [rendaRes, despesasRes, dividasRes, metasRes, extrasRes] = await Promise.all([
                api.get('/usuario'),
                api.get('/despesas'),
                api.get('/dividas'),
                api.get('/metas'),
                api.get(`/rendas-extras?mes=${mesAtual}&ano=${anoAtual}`),
            ]);

            const rendaBase = parseFloat(rendaRes.data.renda_mensal) || 0;
            setRendaMensal(rendaBase);
            setInputRenda(rendaBase.toString());
            setUsername(rendaRes.data.nome || 'Usuário');

            const listaExtras = extrasRes.data || [];
            setRendasExtras(listaExtras);
            setTotalRendasExtras(listaExtras.reduce((sum, item) => sum + parseFloat(item.valor), 0));

            const todasDespesas = despesasRes.data || [];
            const totalPagas = todasDespesas
                .filter(d => {
                    if (!d.data_pagamento) return false;
                    const dataPag = new Date(d.data_pagamento);
                    return dataPag.getMonth() === hoje.getMonth() && dataPag.getFullYear() === hoje.getFullYear();
                })
                .reduce((sum, d) => sum + parseFloat(d.valor), 0);
            setDespesasPagasMes(totalPagas);
            
            setOverdueExpenses(todasDespesas.filter(d => !d.data_pagamento && new Date(d.data_vencimento) < hoje));

            const limite30 = new Date(hoje);
            limite30.setDate(hoje.getDate() + 30);
            setUpcomingExpenses(todasDespesas
                .filter(d => !d.data_pagamento && new Date(d.data_vencimento) >= hoje && new Date(d.data_vencimento) <= limite30)
                .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
            );

            // Cálculo do Plano de Quitação
            const dividasFiltradas = (dividasRes.data || []).filter(d => d.incluir_home);
            setHomeDividas(dividasFiltradas);
            let somaDiariaDivida = 0;
            dividasFiltradas.forEach(div => {
                const totalLiq = parseFloat(div.valor_total) - (parseFloat(div.valor_desconto) || 0);
                const limite = new Date(div.data_limite);
                const diasRestantes = Math.max(0, Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));
                if (diasRestantes > 0 && totalLiq > 0) somaDiariaDivida += totalLiq / diasRestantes;
            });
            setDebtSavingsGoals({ daily: somaDiariaDivida, monthly: somaDiariaDivida * 30 });

        } catch (error) {
            console.error('Sincronia Home Falhou:', error);
            if (error.response?.status === 401) {
                console.log("Token expirado. Aguardando logout manual ou automático.");
            }
        } finally {
            setLoading(false); 
            setRefreshing(false); 
        }
    };
    
    useFocusEffect(useCallback(() => { if (userToken) fetchData(); }, [userToken]));

    const onRefresh = () => fetchData();
    
    /**
     * handleUpdateRenda: Atualiza o valor de renda base no perfil do usuário.
     */
    const handleUpdateRenda = async () => {
        const novaRenda = parseFloat(inputRenda);
        if (isNaN(novaRenda) || novaRenda < 0) { Alert.alert('Valor Inválido', 'Insira um valor numérico.'); return; }
        try {
            await api.put('/usuario', { renda_mensal: novaRenda });
            setRendaModalVisible(false);
            fetchData();
        } catch (error) { Alert.alert('Erro AWS', 'Falha ao atualizar renda.'); }
    };

    /**
     * handleLogout: Finaliza a sessão do usuário.
     */
    const handleLogout = () => {
        Alert.alert("Sair do App", "Deseja realmente encerrar sua sessão?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Sim, Sair", onPress: () => logout(), style: "destructive" }
        ]);
    };

    const handleAddRendaExtra = async () => {
        if (!newRendaExtra.nome || !newRendaExtra.valor) { Alert.alert('Campos Vazios', 'Preencha descrição e valor.'); return; }
        try {
            await api.post('/rendas-extras', { 
                ...newRendaExtra, 
                valor: parseFloat(newRendaExtra.valor), 
                data_recebimento: newRendaExtra.data_recebimento.toISOString().split('T')[0] 
            });
            setAddRendaExtraModalVisible(false);
            setNewRendaExtra({ nome: '', valor: '', data_recebimento: new Date() });
            fetchData();
        } catch (error) { Alert.alert('Erro', 'Falha ao adicionar.'); }
    };

    const handleDeleteRendaExtra = (id) => {
        Alert.alert("Remover Extra", "Confirmar exclusão?", [
            { text: "Não" },
            { text: "Sim", style: 'destructive', onPress: async () => {
                try { await api.delete(`/rendas-extras/${id}`); fetchData(); } 
                catch (error) { Alert.alert("Erro", "Falha ao excluir."); }
            }}
        ]);
    };

    const onChangeDate = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) setNewRendaExtra({ ...newRendaExtra, data_recebimento: selectedDate });
    };

    // ==========================================
    // 5. ESTILOS TÉCNICOS E DINÂMICOS
    // ==========================================
    const dynamicStyles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        header: { padding: 25, paddingVertical: 35, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
        headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        greeting: { fontSize: 28, fontWeight: 'bold' },
        logoutBtn: { backgroundColor: 'rgba(255,0,0,0.05)', borderRadius: 15 },
        scrollContent: { padding: 20, paddingBottom: 150 },
        cardMain: { marginBottom: 20, borderRadius: 28, borderLeftWidth: 12, borderLeftColor: '#4CAF50', elevation: 8, backgroundColor: theme.cardBackground },
        balanceTitle: { fontSize: 40, fontWeight: '900', marginVertical: 10 },
        progress: { height: 14, borderRadius: 7, marginTop: 15 },
        divider: { marginVertical: 18, height: 1.5, backgroundColor: 'rgba(0,0,0,0.05)' },
        row: { flexDirection: 'row', alignItems: 'center' },
        rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
        alertCard: { backgroundColor: theme.danger, borderRadius: 24, marginBottom: 22, elevation: 10 },
        extraItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.subText + '30' },
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: 25 },
        modalBox: { padding: 30, borderRadius: 35, backgroundColor: theme.cardBackground },
        inputField: { borderWidth: 1.5, borderRadius: 16, padding: 20, marginBottom: 18, fontSize: 18, color: theme.text },
        center: { alignItems: 'center', justifyContent: 'center' },
        upcomingBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.subText + '15' }
    });

    if (loading && !refreshing) { 
        return (
            <View style={[dynamicStyles.container, dynamicStyles.center]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{color: theme.subText, marginTop: 10}}>Sincronizando AWS...</Text>
            </View>
        ); 
    }

    const totalRendaReal = rendaMensal + totalRendasExtras;
    const saldoFinal = totalRendaReal - despesasPagasMes;
    const razaoComprometida = totalRendaReal > 0 ? (despesasPagasMes / totalRendaReal) : 0;

    return (
        <View style={dynamicStyles.container}>
            {/* CABEÇALHO REESTRUTURADO COM BOTÃO DE SAIR */}
            <Surface style={[dynamicStyles.header, { backgroundColor: isDarkTheme ? '#151515' : '#f5f5f5' }]} elevation={3}>
                <View style={dynamicStyles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[dynamicStyles.greeting, { color: theme.text }]}>Olá, {username}!</Text>
                        <Paragraph style={{ color: theme.subText }}>Análise rápida da sua saúde financeira</Paragraph>
                    </View>
                    <IconButton 
                        icon="logout-variant" 
                        iconColor={theme.danger} 
                        size={28} 
                        onPress={handleLogout} 
                        style={dynamicStyles.logoutBtn} 
                    />
                </View>
            </Surface>

            <ScrollView
                contentContainerStyle={dynamicStyles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
            >
                {/* ALERTA DE PENDÊNCIAS */}
                {overdueExpenses.length > 0 && (
                    <TouchableOpacity onPress={() => navigation.navigate('Despesas', { initialTab: 'overdue' })} activeOpacity={0.9}>
                        <Card style={dynamicStyles.alertCard}>
                            <Card.Content style={dynamicStyles.row}>
                                <Avatar.Icon size={48} icon="alert-decagram" color="white" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
                                <View style={{ marginLeft: 18, flex: 1 }}>
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Atenção!</Text>
                                    <Text style={{ color: 'white', fontSize: 14 }}>Você possui {overdueExpenses.length} conta(s) em atraso.</Text>
                                </View>
                                <MaterialCommunityIcons name="arrow-right-bold-circle" size={32} color="white" />
                            </Card.Content>
                        </Card>
                    </TouchableOpacity>
                )}

                {/* DASHBOARD DE SALDO */}
                <Card style={[dynamicStyles.cardMain, { borderLeftColor: saldoFinal < 0 ? theme.danger : '#4CAF50' }]}>
                    <Card.Content>
                        <Text style={{ color: theme.subText, fontWeight: 'bold', fontSize: 12, letterSpacing: 1 }}>SALDO ATUAL NO MÊS</Text>
                        <Title style={[dynamicStyles.balanceTitle, { color: saldoFinal < 0 ? theme.danger : '#4CAF50' }]}>
                            R$ {saldoFinal.toFixed(2)}
                        </Title>
                        <ProgressBar progress={razaoComprometida} color={razaoComprometida > 0.8 ? theme.danger : theme.primary} style={dynamicStyles.progress} />
                        <Text style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: theme.subText, fontWeight: 'bold' }}>
                            {`${(razaoComprometida * 100).toFixed(0)}% do seu orçamento comprometido`}
                        </Text>
                        
                        <Divider style={dynamicStyles.divider} />
                        
                        <TouchableOpacity onPress={() => setRendaModalVisible(true)} activeOpacity={0.6} style={dynamicStyles.rowBetween}>
                            <View style={dynamicStyles.row}>
                                <Avatar.Icon size={34} icon="bank-transfer-in" color="#4CAF50" style={{ backgroundColor: '#4CAF5015' }} />
                                <Text style={{ color: theme.text, marginLeft: 15, fontSize: 17, fontWeight: '500' }}>Renda Fixa: R$ {rendaMensal.toFixed(2)}</Text>
                            </View>
                            <MaterialCommunityIcons name="pencil-circle-outline" size={24} color={theme.primary} />
                        </TouchableOpacity>

                        <View style={dynamicStyles.rowBetween}>
                            <View style={dynamicStyles.row}>
                                <Avatar.Icon size={34} icon="bank-transfer-out" color={theme.danger} style={{ backgroundColor: theme.danger + '15' }} />
                                <Text style={{ color: theme.text, marginLeft: 15, fontSize: 17, fontWeight: '500' }}>Contas Pagas: R$ {despesasPagasMes.toFixed(2)}</Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* GESTÃO DE RENDAS EXTRAS */}
                <Card style={[dynamicStyles.cardMain, { borderLeftColor: theme.secondary }]}>
                    <Card.Title 
                        title={`Rendas Extras (R$ ${totalRendasExtras.toFixed(2)})`}
                        titleStyle={{ color: theme.text, fontWeight: 'bold', fontSize: 17 }}
                        right={() => <IconButton icon="plus-circle-outline" iconColor={theme.secondary} size={30} onPress={() => setAddRendaExtraModalVisible(true)} />}
                    />
                    <Card.Content>
                        {rendasExtras.length > 0 ? rendasExtras.map(extra => (
                            <View key={extra.id} style={dynamicStyles.extraItem}>
                                <Text style={{ color: theme.text, flex: 1, fontSize: 15 }}>{extra.nome}</Text>
                                <Text style={{ color: '#4CAF50', fontWeight: '900', fontSize: 16, marginRight: 10 }}>+ R$ {parseFloat(extra.valor).toFixed(2)}</Text>
                                <IconButton icon="delete-sweep-outline" iconColor={theme.danger} size={20} onPress={() => handleDeleteRendaExtra(extra.id)} />
                            </View>
                        )) : (
                            <View style={{padding: 20, alignItems: 'center'}}>
                                <MaterialCommunityIcons name="cash-multiple" size={40} color={theme.subText + '40'} />
                                <Text style={{ color: theme.subText, marginTop: 10 }}>Sem entradas adicionais.</Text>
                            </View>
                        )}
                    </Card.Content>
                </Card>

                {/* PLANO DE QUITAÇÃO INTELIGENTE */}
                {debtSavingsGoals.daily > 0 && (
                    <Card style={[dynamicStyles.cardMain, { backgroundColor: isDarkTheme ? '#2a1b10' : '#fff9f0', borderLeftColor: '#FF9800' }]}>
                        <Card.Title 
                            title="Plano de Quitação" 
                            titleStyle={{ color: theme.text, fontWeight: 'bold' }} 
                            left={() => <Avatar.Icon size={38} icon="calculator-variant" color="#FF9800" style={{backgroundColor: 'transparent'}} />} 
                        />
                        <Card.Content style={dynamicStyles.center}>
                            <Paragraph style={{ color: theme.text, textAlign: 'center', fontSize: 15 }}>Para quitar as dívidas do mês, reserve:</Paragraph>
                            <Title style={{ color: '#FF9800', fontWeight: '900', fontSize: 30, marginVertical: 8 }}>R$ {debtSavingsGoals.daily.toFixed(2)} / dia</Title>
                            <Text style={{ color: theme.subText, fontSize: 12, fontWeight: 'bold' }}>Objetivo mensal: R$ {debtSavingsGoals.monthly.toFixed(2)}</Text>
                        </Card.Content>
                    </Card>
                )}

                {/* PRÓXIMAS CONTAS NO RADAR */}
                {upcomingExpenses.length > 0 && (
                    <Card style={dynamicStyles.cardMain}>
                        <Card.Title 
                            title="Próximos Compromissos" 
                            titleStyle={{ color: theme.text, fontWeight: 'bold' }} 
                            left={() => <Avatar.Icon size={38} icon="calendar-clock" color={theme.primary} style={{backgroundColor: 'transparent'}} />}
                        />
                        <Card.Content>
                            {upcomingExpenses.slice(0, 3).map(exp => (
                                <View key={exp.id} style={dynamicStyles.upcomingBox}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 15 }}>{exp.nome}</Text>
                                        <Text style={{ color: theme.subText, fontSize: 12 }}>Vence em {new Date(exp.data_vencimento).toLocaleDateString('pt-BR')}</Text>
                                    </View>
                                    <Text style={{ color: theme.text, fontWeight: '900', fontSize: 17 }}>R$ {parseFloat(exp.valor).toFixed(2)}</Text>
                                </View>
                            ))}
                            <Button mode="outlined" onPress={() => navigation.navigate('Despesas')} style={{ marginTop: 15, borderRadius: 12 }}>GESTÃO COMPLETA</Button>
                        </Card.Content>
                    </Card>
                )}

                {/* ESPAÇAMENTO PREMIUM PARA SCROLL */}
                <View style={{ height: 250 }} />
            </ScrollView>

            {/* MODAL: ATUALIZAÇÃO DE RENDA BASE */}
            <Modal visible={rendaModalVisible} transparent animationType="slide">
                <View style={dynamicStyles.overlay}>
                    <Surface style={dynamicStyles.modalBox} elevation={5}>
                        <Title style={{ color: theme.text, textAlign: 'center', marginBottom: 25, fontWeight: 'bold' }}>Renda Mensal Fixa</Title>
                        <TextInput 
                            style={[dynamicStyles.inputField, { backgroundColor: isDarkTheme ? '#252525' : '#f9f9f9', borderColor: theme.subText + '30' }]} 
                            keyboardType="numeric" 
                            value={inputRenda} 
                            onChangeText={setInputRenda}
                            placeholder="0.00"
                            placeholderTextColor={theme.subText}
                        />
                        <View style={{flexDirection: 'row', gap: 15}}>
                            <Button mode="text" onPress={() => setRendaModalVisible(false)} textColor={theme.danger} style={{ flex: 1 }}>CANCELAR</Button>
                            <Button mode="contained" onPress={handleUpdateRenda} style={{ flex: 1.5, borderRadius: 15 }}>SALVAR RENDA</Button>
                        </View>
                    </Surface>
                </View>
            </Modal>

            {/* MODAL: NOVA ENTRADA EXTRA */}
            <Modal visible={addRendaExtraModalVisible} transparent animationType="fade">
                <View style={dynamicStyles.overlay}>
                    <Surface style={dynamicStyles.modalBox} elevation={5}>
                        <Title style={{ color: theme.text, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' }}>Nova Entrada Extra</Title>
                        <TextInput style={[dynamicStyles.inputField, { backgroundColor: isDarkTheme ? '#252525' : '#f9f9f9' }]} placeholder="Descrição (ex: Bônus)" placeholderTextColor={theme.subText} value={newRendaExtra.nome} onChangeText={t => setNewRendaExtra({...newRendaExtra, nome: t})} />
                        <TextInput style={[dynamicStyles.inputField, { backgroundColor: isDarkTheme ? '#252525' : '#f9f9f9' }]} placeholder="Valor R$" placeholderTextColor={theme.subText} keyboardType="numeric" value={newRendaExtra.valor} onChangeText={t => setNewRendaExtra({...newRendaExtra, valor: t})} />
                        
                        <TouchableOpacity style={[dynamicStyles.inputField, { backgroundColor: isDarkTheme ? '#252525' : '#f9f9f9', justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
                            <Text style={{ color: theme.text }}>Data: {newRendaExtra.data_recebimento.toLocaleDateString('pt-BR')}</Text>
                        </TouchableOpacity>
                        
                        {showDatePicker && <DateTimePicker value={newRendaExtra.data_recebimento} mode="date" display="default" onChange={onChangeDate} />}
                        
                        <View style={{flexDirection: 'row', gap: 15, marginTop: 10}}>
                            <Button mode="text" onPress={() => setAddRendaExtraModalVisible(false)} textColor={theme.danger} style={{ flex: 1 }}>FECHAR</Button>
                            <Button mode="contained" onPress={handleAddRendaExtra} style={{ flex: 1.5, borderRadius: 15 }}>CONFIRMAR</Button>
                        </View>
                    </Surface>
                </View>
            </Modal>
        </View>
    );
}
