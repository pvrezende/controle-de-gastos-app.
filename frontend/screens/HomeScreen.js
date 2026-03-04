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
 * Descrição: Central de inteligência financeira conectada ao RDS AWS.
 * Correção Crítica: Logout híbrido (Web/App) para garantir encerramento de sessão.
 */
export default function HomeScreen({ navigation }) {
    // Injeção de dependências do contexto de autenticação e tema
    const { api, userToken, logout } = useContext(AuthContext); 
    const { theme, isDarkTheme } = useContext(ThemeContext); 
    
    // ==========================================
    // 1. ESTADOS DE CONTROLE DE DADOS (DASHBOARD)
    // ==========================================
    const [rendaMensal, setRendaMensal] = useState(0);
    const [despesasPagasMes, setDespesasPagasMes] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [username, setUsername] = useState('');

    // ==========================================
    // 2. ESTADOS DE GASTOS, DÍVIDAS E ALERTAS
    // ==========================================
    const [upcomingExpenses, setUpcomingExpenses] = useState([]);
    const [overdueExpenses, setOverdueExpenses] = useState([]);
    const [debtSavingsGoals, setDebtSavingsGoals] = useState({ daily: 0, monthly: 0 });
    const [homeDividas, setHomeDividas] = useState([]);
    const [homeMetas, setHomeMetas] = useState([]);

    // ==========================================
    // 3. ESTADOS DE RENDIMENTOS ADICIONAIS
    // ==========================================
    const [rendasExtras, setRendasExtras] = useState([]);
    const [totalRendasExtras, setTotalRendasExtras] = useState(0);

    // ==========================================
    // 4. ESTADOS DE INTERFACE E FORMULÁRIOS
    // ==========================================
    const [rendaModalVisible, setRendaModalVisible] = useState(false);
    const [inputRenda, setInputRenda] = useState('');
    const [addRendaExtraModalVisible, setAddRendaExtraModalVisible] = useState(false);
    const [newRendaExtra, setNewRendaExtra] = useState({ nome: '', valor: '', data_recebimento: new Date() });
    const [showDatePicker, setShowDatePicker] = useState(false);

    /**
     * fetchData: Sincronização mestre com a infraestrutura RDS AWS.
     * Realiza o cálculo de comprometimento e processa alertas de vencimento.
     */
    const fetchData = async () => {
        try {
            setRefreshing(true);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const mesAtual = hoje.getMonth() + 1;
            const anoAtual = hoje.getFullYear();

            // Chamada paralela de alta performance para reduzir latência
            const [rendaRes, despesasRes, dividasRes, metasRes, extrasRes] = await Promise.all([
                api.get('/usuario'),
                api.get('/despesas'),
                api.get('/dividas'),
                api.get('/metas'),
                api.get(`/rendas-extras?mes=${mesAtual}&ano=${anoAtual}`),
            ]);

            // Processamento do Perfil do Usuário
            const rendaBase = parseFloat(rendaRes.data.renda_mensal) || 0;
            setRendaMensal(rendaBase);
            setInputRenda(rendaBase.toString());
            setUsername(rendaRes.data.nome || 'Usuário');

            // Processamento de Rendas Extras
            const listaExtras = extrasRes.data || [];
            setRendasExtras(listaExtras);
            setTotalRendasExtras(listaExtras.reduce((sum, item) => sum + parseFloat(item.valor), 0));

            // Lógica de Despesas do Mês
            const todasDespesas = despesasRes.data || [];
            const totalPagas = todasDespesas
                .filter(d => {
                    if (!d.data_pagamento) return false;
                    const dataPag = new Date(d.data_pagamento);
                    return dataPag.getMonth() === hoje.getMonth() && dataPag.getFullYear() === hoje.getFullYear();
                })
                .reduce((sum, d) => sum + parseFloat(d.valor), 0);
            setDespesasPagasMes(totalPagas);
            
            // Verificação de Inadimplência
            setOverdueExpenses(todasDespesas.filter(d => !d.data_pagamento && new Date(d.data_vencimento) < hoje));

            // Projeção de fluxo de caixa (30 dias)
            const limite30 = new Date(hoje);
            limite30.setDate(hoje.getDate() + 30);
            setUpcomingExpenses(todasDespesas
                .filter(d => !d.data_pagamento && new Date(d.data_vencimento) >= hoje && new Date(d.data_vencimento) <= limite30)
                .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
            );

            // Cálculos de Metas Inteligentes
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
            console.error('Erro de Sincronia AWS:', error);
            if (error.response?.status === 401) logout();
        } finally {
            setLoading(false); 
            setRefreshing(false); 
        }
    };
    
    useFocusEffect(useCallback(() => { if (userToken) fetchData(); }, [userToken]));

    const onRefresh = () => fetchData();

    /**
     * handleLogout: MECANISMO HÍBRIDO DE SAÍDA
     * Resolve o problema do clique morto no site (Web) usando window.confirm.
     */
    const handleLogout = () => {
        if (Platform.OS === 'web') {
            // Lógica para Navegador: O window.confirm é síncrono e garantido na Web
            const check = window.confirm("Deseja realmente encerrar sua sessão?");
            if (check) logout();
        } else {
            // Lógica para APK (Android/iOS): Usa o alerta nativo estilizado
            Alert.alert("Encerrar Sessão", "Você será desconectado da sua conta AWS. Continuar?", [
                { text: "Cancelar", style: "cancel" },
                { text: "Sim, Sair", onPress: () => logout(), style: "destructive" }
            ]);
        }
    };

    /**
     * handleUpdateRenda: Persiste a alteração do salário base no banco.
     */
    const handleUpdateRenda = async () => {
        const nR = parseFloat(inputRenda);
        if (isNaN(nR) || nR < 0) { Alert.alert('Erro', 'Insira um valor numérico válido.'); return; }
        try {
            await api.put('/usuario', { renda_mensal: nR });
            setRendaModalVisible(false);
            fetchData();
        } catch (error) { Alert.alert('Falha AWS', 'Não foi possível atualizar sua renda.'); }
    };

    const handleAddRendaExtra = async () => {
        if (!newRendaExtra.nome || !newRendaExtra.valor) { Alert.alert('Campos Obrigatórios', 'Preencha o nome e o valor.'); return; }
        try {
            await api.post('/rendas-extras', { 
                ...newRendaExtra, 
                valor: parseFloat(newRendaExtra.valor), 
                data_recebimento: newRendaExtra.data_recebimento.toISOString().split('T')[0] 
            });
            setAddRendaExtraModalVisible(false);
            setNewRendaExtra({ nome: '', valor: '', data_recebimento: new Date() });
            fetchData();
        } catch (error) { Alert.alert('Erro', 'Erro ao processar entrada extra.'); }
    };

    const handleDeleteRendaExtra = (id) => {
        const deleteExec = async () => {
            try { await api.delete(`/rendas-extras/${id}`); fetchData(); } 
            catch (e) { Alert.alert("Erro", "Não foi possível remover o registro."); }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Confirmar exclusão da renda extra?")) deleteExec();
        } else {
            Alert.alert("Excluir Renda", "Deseja remover este registro permanentemente?", [
                { text: "Voltar" },
                { text: "Remover", style: 'destructive', onPress: deleteExec }
            ]);
        }
    };

    const onChangeDate = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) setNewRendaExtra({ ...newRendaExtra, data_recebimento: selectedDate });
    };

    // ==========================================
    // 5. FOLHA DE ESTILOS PREMIUM E DINÂMICA
    // ==========================================
    const dynamicStyles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        header: { padding: 25, paddingVertical: 35, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
        headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        greeting: { fontSize: 28, fontWeight: 'bold' },
        // Visual aprimorado para o botão de logout
        logoutBtn: { backgroundColor: 'rgba(255,82,82,0.12)', borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,82,82,0.2)' },
        scrollContent: { padding: 20, paddingBottom: 150 },
        cardMain: { marginBottom: 20, borderRadius: 28, borderLeftWidth: 12, borderLeftColor: '#4CAF50', elevation: 8, backgroundColor: theme.cardBackground },
        balanceTitle: { fontSize: 40, fontWeight: '900', marginVertical: 10 },
        progress: { height: 14, borderRadius: 7, marginTop: 15 },
        divider: { marginVertical: 18, height: 1.5, backgroundColor: 'rgba(0,0,0,0.05)' },
        row: { flexDirection: 'row', alignItems: 'center' },
        rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
        alertCard: { backgroundColor: theme.danger, borderRadius: 24, marginBottom: 22, elevation: 10 },
        extraItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.subText + '30' },
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center', padding: 25 },
        modalBox: { padding: 30, borderRadius: 35, backgroundColor: theme.cardBackground },
        inputField: { borderWidth: 1.5, borderRadius: 16, padding: 20, marginBottom: 18, fontSize: 18, color: theme.text },
        center: { alignItems: 'center', justifyContent: 'center' },
        upcomingBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.subText + '15' }
    });

    if (loading && !refreshing) { 
        return (
            <View style={[dynamicStyles.container, dynamicStyles.center]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{color: theme.subText, marginTop: 15, fontWeight: 'bold'}}>Conectando ao Banco RDS...</Text>
            </View>
        ); 
    }

    // Cálculos de exibição imediata
    const totalRendaReal = rendaMensal + totalRendasExtras;
    const saldoFinal = totalRendaReal - despesasPagasMes;
    const razaoComprometida = totalRendaReal > 0 ? (despesasPagasMes / totalRendaReal) : 0;

    return (
        <View style={dynamicStyles.container}>
            {/* CABEÇALHO COM BOTÃO DE LOGOUT FUNCIONAL PARA TODAS AS PLATAFORMAS */}
            <Surface style={[dynamicStyles.header, { backgroundColor: isDarkTheme ? '#151515' : '#f5f5f5' }]} elevation={4}>
                <View style={dynamicStyles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[dynamicStyles.greeting, { color: theme.text }]}>Olá, {username}!</Text>
                        <Paragraph style={{ color: theme.subText, fontSize: 13 }}>Sincronizado com sua nuvem AWS</Paragraph>
                    </View>
                    <IconButton 
                        icon="logout" 
                        iconColor="#FF5252" 
                        size={30} 
                        onPress={handleLogout} 
                        style={dynamicStyles.logoutBtn} 
                    />
                </View>
            </Surface>

            <ScrollView
                contentContainerStyle={dynamicStyles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
            >
                {/* ALERTA DE PENDÊNCIAS FINANCEIRAS */}
                {overdueExpenses.length > 0 && (
                    <TouchableOpacity onPress={() => navigation.navigate('Despesas', { initialTab: 'overdue' })} activeOpacity={0.9}>
                        <Card style={dynamicStyles.alertCard}>
                            <Card.Content style={dynamicStyles.row}>
                                <Avatar.Icon size={48} icon="alert-rhombus" color="white" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
                                <View style={{ marginLeft: 18, flex: 1 }}>
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Pagamentos Atrasados!</Text>
                                    <Text style={{ color: 'white', fontSize: 14 }}>Existem {overdueExpenses.length} itens que requerem atenção.</Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={32} color="white" />
                            </Card.Content>
                        </Card>
                    </TouchableOpacity>
                )}

                {/* VISÃO GERAL DO SALDO DISPONÍVEL */}
                <Card style={[dynamicStyles.cardMain, { borderLeftColor: saldoFinal < 0 ? theme.danger : '#4CAF50' }]}>
                    <Card.Content>
                        <Text style={{ color: theme.subText, fontWeight: 'bold', fontSize: 12, letterSpacing: 1 }}>CAPITAL DISPONÍVEL</Text>
                        <Title style={[dynamicStyles.balanceTitle, { color: saldoFinal < 0 ? theme.danger : '#4CAF50' }]}>
                            R$ {saldoFinal.toFixed(2)}
                        </Title>
                        <ProgressBar progress={razaoComprometida} color={razaoComprometida > 0.85 ? theme.danger : theme.primary} style={dynamicStyles.progress} />
                        <Text style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: theme.subText, fontWeight: 'bold' }}>
                            {`${(razaoComprometida * 100).toFixed(0)}% do orçamento consumido`}
                        </Text>
                        
                        <Divider style={dynamicStyles.divider} />
                        
                        <TouchableOpacity onPress={() => setRendaModalVisible(true)} activeOpacity={0.6} style={dynamicStyles.rowBetween}>
                            <View style={dynamicStyles.row}>
                                <Avatar.Icon size={34} icon="bank-transfer-in" color="#4CAF50" style={{ backgroundColor: '#4CAF5015' }} />
                                <Text style={{ color: theme.text, marginLeft: 15, fontSize: 17, fontWeight: '500' }}>Renda Mensal: R$ {rendaMensal.toFixed(2)}</Text>
                            </View>
                            <MaterialCommunityIcons name="square-edit-outline" size={24} color={theme.primary} />
                        </TouchableOpacity>

                        <View style={dynamicStyles.rowBetween}>
                            <View style={dynamicStyles.row}>
                                <Avatar.Icon size={34} icon="bank-transfer-out" color={theme.danger} style={{ backgroundColor: theme.danger + '15' }} />
                                <Text style={{ color: theme.text, marginLeft: 15, fontSize: 17, fontWeight: '500' }}>Liquidações: R$ {despesasPagasMes.toFixed(2)}</Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* BLOCO DE RENDIMENTOS EXTRAS */}
                <Card style={[dynamicStyles.cardMain, { borderLeftColor: theme.secondary }]}>
                    <Card.Title 
                        title={`Rendas Extras (R$ ${totalRendasExtras.toFixed(2)})`}
                        titleStyle={{ color: theme.text, fontWeight: 'bold', fontSize: 17 }}
                        right={() => <IconButton icon="plus-box" iconColor={theme.secondary} size={30} onPress={() => setAddRendaExtraModalVisible(true)} />}
                    />
                    <Card.Content>
                        {rendasExtras.length > 0 ? rendasExtras.map(extra => (
                            <View key={extra.id} style={dynamicStyles.extraItem}>
                                <Text style={{ color: theme.text, flex: 1, fontSize: 15 }}>{extra.nome}</Text>
                                <Text style={{ color: '#4CAF50', fontWeight: '900', fontSize: 16, marginRight: 10 }}>+ R$ {parseFloat(extra.valor).toFixed(2)}</Text>
                                <IconButton icon="delete-circle-outline" iconColor={theme.danger} size={22} onPress={() => handleDeleteRendaExtra(extra.id)} />
                            </View>
                        )) : (
                            <View style={{padding: 30, alignItems: 'center', opacity: 0.5}}>
                                <MaterialCommunityIcons name="cash-remove" size={50} color={theme.subText} />
                                <Text style={{ color: theme.subText, marginTop: 10, fontWeight: 'bold' }}>Nenhum bônus este mês.</Text>
                            </View>
                        )}
                    </Card.Content>
                </Card>

                {/* PLANO DE QUITAÇÃO AUTOMATIZADO */}
                {debtSavingsGoals.daily > 0 && (
                    <Card style={[dynamicStyles.cardMain, { backgroundColor: isDarkTheme ? '#2a1b10' : '#fff9f0', borderLeftColor: '#FF9800' }]}>
                        <Card.Title 
                            title="Reserva de Quitação" 
                            titleStyle={{ color: theme.text, fontWeight: 'bold' }} 
                            left={() => <Avatar.Icon size={38} icon="safe" color="#FF9800" style={{backgroundColor: 'transparent'}} />} 
                        />
                        <Card.Content style={dynamicStyles.center}>
                            <Paragraph style={{ color: theme.text, textAlign: 'center', fontSize: 15 }}>Para cobrir as dívidas pendentes, guarde:</Paragraph>
                            <Title style={{ color: '#FF9800', fontWeight: '900', fontSize: 32, marginVertical: 8 }}>R$ {debtSavingsGoals.daily.toFixed(2)} / dia</Title>
                            <Text style={{ color: theme.subText, fontSize: 13, fontWeight: 'bold' }}>Projeção Mensal: R$ {debtSavingsGoals.monthly.toFixed(2)}</Text>
                        </Card.Content>
                    </Card>
                )}

                {/* PRÓXIMAS CONTAS AGENDADAS */}
                {upcomingExpenses.length > 0 && (
                    <Card style={[dynamicStyles.cardMain, { borderLeftColor: theme.primary }]}>
                        <Card.Title 
                            title="Agenda de Vencimentos" 
                            titleStyle={{ color: theme.text, fontWeight: 'bold' }} 
                            left={() => <Avatar.Icon size={38} icon="calendar-heart" color={theme.primary} style={{backgroundColor: 'transparent'}} />}
                        />
                        <Card.Content>
                            {upcomingExpenses.slice(0, 3).map(exp => (
                                <View key={exp.id} style={dynamicStyles.upcomingBox}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 15 }}>{exp.nome}</Text>
                                        <Text style={{ color: theme.subText, fontSize: 12 }}>Vencimento: {new Date(exp.data_vencimento).toLocaleDateString('pt-BR')}</Text>
                                    </View>
                                    <Text style={{ color: theme.text, fontWeight: '900', fontSize: 17 }}>R$ {parseFloat(exp.valor).toFixed(2)}</Text>
                                </View>
                            ))}
                            <Button mode="text" onPress={() => navigation.navigate('Despesas')} style={{ marginTop: 15 }}>DETALHAR TODAS AS CONTAS</Button>
                        </Card.Content>
                    </Card>
                )}

                {/* ESPAÇAMENTO PREMIUM PARA GARANTIR SCROLL SUAVE */}
                <View style={{ height: 280 }} />
            </ScrollView>

            {/* MODAL: EDIÇÃO DE SALÁRIO BASE */}
            <Modal visible={rendaModalVisible} transparent animationType="slide">
                <View style={dynamicStyles.overlay}>
                    <Surface style={dynamicStyles.modalBox} elevation={6}>
                        <Title style={{ color: theme.text, textAlign: 'center', marginBottom: 25, fontWeight: 'bold' }}>Renda Mensal Fixa</Title>
                        <TextInput 
                            style={[dynamicStyles.inputField, { backgroundColor: isDarkTheme ? '#252525' : '#f9f9f9', borderColor: theme.subText + '30' }]} 
                            keyboardType="numeric" 
                            value={inputRenda} 
                            onChangeText={setInputRenda}
                            placeholder="Ex: 3500.00"
                            placeholderTextColor={theme.subText}
                        />
                        <View style={{flexDirection: 'row', gap: 15}}>
                            <Button mode="text" onPress={() => setRendaModalVisible(false)} textColor={theme.danger} style={{ flex: 1 }}>CANCELAR</Button>
                            <Button mode="contained" onPress={handleUpdateRenda} style={{ flex: 1.5, borderRadius: 15 }}>ATUALIZAR RENDA</Button>
                        </View>
                    </Surface>
                </View>
            </Modal>

            {/* MODAL: LANÇAMENTO DE RENDA EXTRA */}
            <Modal visible={addRendaExtraModalVisible} transparent animationType="fade">
                <View style={dynamicStyles.overlay}>
                    <Surface style={dynamicStyles.modalBox} elevation={6}>
                        <Title style={{ color: theme.text, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' }}>Nova Entrada Adicional</Title>
                        <TextInput style={[dynamicStyles.inputField, { backgroundColor: isDarkTheme ? '#252525' : '#f9f9f9' }]} placeholder="Descrição (ex: Venda OLX)" placeholderTextColor={theme.subText} value={newRendaExtra.nome} onChangeText={t => setNewRendaExtra({...newRendaExtra, nome: t})} />
                        <TextInput style={[dynamicStyles.inputField, { backgroundColor: isDarkTheme ? '#252525' : '#f9f9f9' }]} placeholder="Valor Recebido R$" placeholderTextColor={theme.subText} keyboardType="numeric" value={newRendaExtra.valor} onChangeText={t => setNewRendaExtra({...newRendaExtra, valor: t})} />
                        
                        <TouchableOpacity style={[dynamicStyles.inputField, { backgroundColor: isDarkTheme ? '#252525' : '#f9f9f9', justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
                            <Text style={{ color: theme.text }}>Data do Recebimento: {newRendaExtra.data_recebimento.toLocaleDateString('pt-BR')}</Text>
                        </TouchableOpacity>
                        
                        {showDatePicker && <DateTimePicker value={newRendaExtra.data_recebimento} mode="date" display="default" onChange={onChangeDate} />}
                        
                        <View style={{flexDirection: 'row', gap: 15, marginTop: 15}}>
                            <Button mode="text" onPress={() => setAddRendaExtraModalVisible(false)} textColor={theme.danger} style={{ flex: 1 }}>ABORTAR</Button>
                            <Button mode="contained" onPress={handleAddRendaExtra} style={{ flex: 1.5, borderRadius: 15 }}>CONFIRMAR DEPÓSITO</Button>
                        </View>
                    </Surface>
                </View>
            </Modal>
        </View>
    );
}
