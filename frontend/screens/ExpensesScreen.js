// frontend/screens/ExpensesScreen.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, Platform } from 'react-native';
import { Card, Title, Paragraph, Button, FAB, Menu, IconButton } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

export default function ExpensesScreen({ route, navigation }) {
    const { api } = useContext(AuthContext);
    const { theme, isDarkTheme } = useContext(ThemeContext);
    const [despesas, setDespesas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // CONFIGURAÇÃO INICIAL: ABA GERAL (INTERVALO) É A PRIMEIRA EXIBIDA
    const [selectedTab, setSelectedTab] = useState('all'); 
    
    const [parcelamentos, setParcelamentos] = useState([]);
    const [fabOpen, setFabOpen] = useState(false);
    const [totalPagoMes, setTotalPagoMes] = useState(0);
    const [totalPagoGeral, setTotalPagoGeral] = useState(0);

    // ESTADOS PARA FILTRO DE PERÍODO (INÍCIO E FIM) - PERMITE ANOS DIFERENTES
    const [monthStart, setMonthStart] = useState(new Date().getMonth() + 1);
    const [yearStart, setYearStart] = useState(new Date().getFullYear());
    const [monthEnd, setMonthEnd] = useState(new Date().getMonth() + 1);
    const [yearEnd, setYearEnd] = useState(new Date().getFullYear());

    const [expenseModalVisible, setExpenseModalVisible] = useState(false);
    const [parcelamentoModalVisible, setParcelamentoModalVisible] = useState(false);

    const [newExpense, setNewExpense] = useState({ nome: '', valor: '', data_vencimento: new Date(), categoria: 'outros' });
    const [newParcelamento, setNewParcelamento] = useState({
        nome: '',
        valor_total: '',
        numero_parcelas: '',
        data_compra: new Date(),
        data_primeira_parcela: new Date(),
    });

    const [showExpensePicker, setShowExpensePicker] = useState(false);
    const [showCompraPicker, setShowCompraPicker] = useState(false);
    const [showPrimeiraParcelaPicker, setShowPrimeiraParcelaPicker] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [showEditDatePicker, setShowEditDatePicker] = useState(false);
    const [visibleExpenseMenu, setVisibleExpenseMenu] = useState(null);

    const [editParcelamentoModalVisible, setEditParcelamentoModalVisible] = useState(false);
    const [editingParcelamento, setEditingParcelamento] = useState(null);
    const [visibleParcelamentoMenu, setVisibleParcelamentoMenu] = useState(null);

    const [categorias, setCategorias] = useState([]);
    const [addCategoriaModalVisible, setAddCategoriaModalVisible] = useState(false);
    const [editCategoriaModalVisible, setEditCategoriaModalVisible] = useState(false);
    const [editingCategoria, setEditingCategoria] = useState(null);
    const [newCategoria, setNewCategoria] = useState({ nome: '', icone: '' });
    const [iconListModalVisible, setIconListModalVisible] = useState(false);

    const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
    const [selectedExpenseToPay, setSelectedExpenseToPay] = useState(null);

    // ==========================================
    // BLOCO DE FUNÇÕES DE SUPORTE E FORMATAÇÃO
    // ==========================================

    const formatLocalDateForDB = (date) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatToBR = (dateString) => {
        if (!dateString) return "";
        const parts = dateString.split('T')[0].split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const WebDatePicker = ({ value, onChange, label }) => (
        <View style={{ marginBottom: 10 }}>
            <Text style={{ color: theme.text, marginBottom: 5 }}>{label}:</Text>
            <input
                type="date"
                value={value.toISOString().split('T')[0]}
                onChange={(e) => onChange(null, new Date(e.target.value + 'T12:00:00'))}
                style={{
                    padding: '10px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.subText}`,
                    backgroundColor: isDarkTheme ? '#2c2c2c' : '#fff',
                    color: isDarkTheme ? '#fff' : '#000',
                    width: '100%',
                    fontSize: '16px',
                    outline: 'none'
                }}
            />
        </View>
    );

    const openMenu = () => setMenuVisible(true);
    const closeMenu = () => setMenuVisible(false);
    const openExpenseMenu = (id) => setVisibleExpenseMenu(id);
    const closeExpenseMenu = () => setVisibleExpenseMenu(null);
    const openParcelamentoMenu = (id) => setVisibleParcelamentoMenu(id);
    const closeParcelamentoMenu = () => setVisibleParcelamentoMenu(null);

    useEffect(() => {
        if (route.params?.initialTab) {
            setSelectedTab(route.params.initialTab);
            navigation.setParams({ initialTab: undefined });
        }
    }, [route.params?.initialTab]);

    const tabNames = {
        all: 'Geral',
        current: 'Mês Atual',
        future: 'Próximos',
        overdue: 'Atrasadas',
        paid: 'Pagas',
        parcelados: 'Parcelados',
    };

    // ==========================================
    // BLOCO DE BUSCA DE DADOS (API)
    // ==========================================

    const fetchCategorias = async () => {
        try {
            const response = await api.get('/categorias');
            setCategorias(response.data);
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
        }
    };

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const [despesasResponse, parcelamentosResponse] = await Promise.all([
                api.get('/despesas'),
                api.get('/parcelamentos')
            ]);
            setDespesas(despesasResponse.data);
            setParcelamentos(parcelamentosResponse.data);
            
            const hoje = new Date();
            const mesAtual = hoje.getMonth() + 1;
            const anoAtual = hoje.getFullYear();

            const totalPagoNoMes = despesasResponse.data
                .filter(d => {
                    if (!d.data_pagamento) return false;
                    const p = d.data_pagamento.split('T')[0].split('-');
                    return parseInt(p[1]) === mesAtual && parseInt(p[0]) === anoAtual;
                })
                .reduce((sum, d) => sum + parseFloat(d.valor), 0);
            setTotalPagoMes(totalPagoNoMes);

            const totalGeralPago = despesasResponse.data
                .filter(d => d.data_pagamento !== null)
                .reduce((sum, d) => sum + parseFloat(d.valor), 0);
            setTotalPagoGeral(totalGeralPago);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => {
        fetchData();
        fetchCategorias();
    }, []));

    const onRefresh = () => { fetchData(); fetchCategorias(); };

    // ==========================================
    // BLOCO DE OPERAÇÕES DE CRIAÇÃO (POST)
    // ==========================================

    const handleAddExpense = async () => {
        if (!newExpense.nome || !newExpense.valor || !newExpense.categoria) {
            Alert.alert('Erro', 'Preencha os campos obrigatórios.');
            return;
        }
        try {
            await api.post('/despesas', {
                ...newExpense,
                valor: parseFloat(newExpense.valor),
                data_vencimento: formatLocalDateForDB(newExpense.data_vencimento),
            });
            setExpenseModalVisible(false);
            setNewExpense({ nome: '', valor: '', data_vencimento: new Date(), categoria: 'outros' });
            fetchData();
        } catch (error) { console.error(error); }
    };

    const handleAddParcelamento = async () => {
        if (!newParcelamento.nome || !newParcelamento.valor_total || !newParcelamento.numero_parcelas) {
            Alert.alert('Erro', 'Preencha todos os campos do parcelamento.');
            return;
        }
        try {
            await api.post('/parcelamentos', {
                ...newParcelamento,
                valor_total: parseFloat(newParcelamento.valor_total),
                numero_parcelas: parseInt(newParcelamento.numero_parcelas, 10),
                data_compra: formatLocalDateForDB(newParcelamento.data_compra),
                data_primeira_parcela: formatLocalDateForDB(newParcelamento.data_primeira_parcela),
            });
            setParcelamentoModalVisible(false);
            setNewParcelamento({ nome: '', valor_total: '', numero_parcelas: '', data_compra: new Date(), data_primeira_parcela: new Date() });
            fetchData();
        } catch (error) { console.error(error); }
    };

    const handleAddCategoria = async () => {
        if (!newCategoria.nome || !newCategoria.icone) {
            Alert.alert('Erro', 'Nome e ícone são obrigatórios.');
            return;
        }
        try {
            await api.post('/categorias', newCategoria);
            setAddCategoriaModalVisible(false);
            setNewCategoria({ nome: '', icone: '' });
            fetchCategorias();
        } catch (error) { console.error(error); }
    };

    // ==========================================
    // BLOCO DE OPERAÇÕES DE EDIÇÃO E STATUS (PUT)
    // ==========================================

    const handleMarkAsPaidWithDate = async (event, selectedDate) => {
        setShowPaymentDatePicker(false);
        if (selectedDate && selectedExpenseToPay) {
            try {
                await api.put(`/despesas/${selectedExpenseToPay.id}/pagar`, { 
                    data_pagamento: formatLocalDateForDB(selectedDate) 
                });
                setSelectedExpenseToPay(null);
                fetchData();
            } catch (error) { console.error(error); }
        }
    };

    const handleTogglePaymentStatus = async (despesa) => {
        const setPendente = async () => {
            try {
                await api.put(`/despesas/${despesa.id}/pagar`, { data_pagamento: null });
                fetchData();
            } catch (e) { console.error(e); }
        };

        if (despesa.data_pagamento) {
            if (Platform.OS === 'web') {
                if (window.confirm("Voltar esta conta para PENDENTE?")) setPendente();
            } else {
                Alert.alert("Confirmar", "Marcar como pendente?", [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Sim", onPress: setPendente }
                ]);
            }
        } else {
            if (Platform.OS === 'web') {
                const h = new Date();
                const inputDate = window.prompt("Data do pagamento (DD/MM/AAAA):", h.toLocaleDateString('pt-BR'));
                if (inputDate) {
                    const p = inputDate.split('/');
                    if (p.length === 3) {
                        try {
                            await api.put(`/despesas/${despesa.id}/pagar`, { data_pagamento: `${p[2]}-${p[1]}-${p[0]}` });
                            fetchData();
                        } catch (e) { alert("Erro ao salvar."); }
                    }
                }
            } else {
                setSelectedExpenseToPay(despesa);
                setShowPaymentDatePicker(true);
            }
        }
    };

    const handleUpdateExpense = async () => {
        if (!editingExpense) return;
        try {
            await api.put(`/despesas/${editingExpense.id}`, {
                ...editingExpense,
                valor: parseFloat(editingExpense.valor),
                data_vencimento: formatLocalDateForDB(editingExpense.data_vencimento),
            });
            setEditModalVisible(false);
            setEditingExpense(null);
            fetchData();
        } catch (error) { console.error(error); }
    };

    const handleUpdateCategoria = async () => {
        if (!editingCategoria?.nome || !editingCategoria?.icone) {
            Alert.alert('Erro', 'Preencha tudo.'); return;
        }
        try {
            await api.put(`/categorias/${editingCategoria.id}`, { nome: editingCategoria.nome, icone: editingCategoria.icone });
            setEditCategoriaModalVisible(false);
            setEditingCategoria(null);
            fetchCategorias();
        } catch (error) { console.error(error); }
    };

    const handleUpdateParcelamento = async () => {
        if (!editingParcelamento) return;
        try {
            await api.put(`/parcelamentos/${editingParcelamento.id}`, { nome: editingParcelamento.nome, categoria: editingParcelamento.categoria });
            setEditParcelamentoModalVisible(false);
            setEditingParcelamento(null);
            fetchData();
        } catch (error) { console.error(error); }
    };

    // ==========================================
    // BLOCO DE OPERAÇÕES DE EXCLUSÃO (DELETE)
    // ==========================================

    const handleDeleteExpense = (id) => {
        closeExpenseMenu();
        const del = async () => { try { await api.delete(`/despesas/${id}`); fetchData(); } catch (e) {} };
        if (Platform.OS === 'web') { if (window.confirm("Excluir despesa?")) del(); }
        else { Alert.alert("Confirmar", "Excluir?", [{text:"Não"},{text:"Sim", onPress: del}]); }
    };

    const handleDeleteCategoria = (id) => {
        const delCat = async () => { try { await api.delete(`/categorias/${id}`); fetchCategorias(); } catch (e) {} };
        if (Platform.OS === 'web') { if(window.confirm("Excluir categoria?")) delCat(); }
        else { Alert.alert("Confirmar", "Excluir?", [{text:"Não"}, {text:"Sim", onPress: delCat}]); }
    };

    const handleDeleteParcelamento = (id) => {
        closeParcelamentoMenu();
        const delP = async () => { try { await api.delete(`/parcelamentos/${id}`); fetchData(); } catch (e) {} };
        if (Platform.OS === 'web') { if(window.confirm("Excluir todas as parcelas?")) delP(); }
        else { Alert.alert("Confirmar", "Excluir todas as parcelas?", [{text:"Não"}, {text:"Sim", onPress: delP}]); }
    };

    // ==========================================
    // BLOCO DE LÓGICA DE FILTRO E TABELAS
    // ==========================================

    const filterExpenses = () => {
        return despesas.filter(despesa => {
            const p = despesa.data_vencimento.split('T')[0].split('-');
            const dueDate = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]), 12, 0, 0);

            if (selectedTab === 'all') {
                const start = new Date(yearStart, monthStart - 1, 1, 0, 0, 0);
                const end = new Date(yearEnd, monthEnd, 0, 23, 59, 59);
                return dueDate >= start && dueDate <= end;
            }

            const today = new Date(); today.setHours(0,0,0,0);
            if (selectedTab === 'current') return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
            if (selectedTab === 'future') return dueDate > today;
            if (selectedTab === 'overdue') return dueDate < today && despesa.data_pagamento === null;
            if (selectedTab === 'paid') return despesa.data_pagamento !== null;
            return false;
        });
    };

    const handleOpenEditModal = (expense) => {
        const p = expense.data_vencimento.split('T')[0].split('-');
        setEditingExpense({ ...expense, valor: String(expense.valor), data_vencimento: new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]), 12, 0, 0) });
        setEditModalVisible(true);
        closeExpenseMenu();
    };

    const handleOpenEditParcelamentoModal = (item) => {
        setEditingParcelamento({ ...item });
        setEditParcelamentoModalVisible(true);
        closeParcelamentoMenu();
    };

    const selectTab = (tab) => { closeMenu(); setTimeout(() => setSelectedTab(tab), 100); };
    const getIconForCategory = (name) => { const c = categorias.find(cat => cat.nome === name); return c ? c.icone : 'help-circle-outline'; };
    const getCategoryForParcelamento = (id) => { const d = despesas.find(d => d.compra_parcelada_id === id); return d ? d.categoria : 'outros'; };
    
    const onChangeExpenseDate = (e, d) => { setShowExpensePicker(false); if(d) setNewExpense({...newExpense, data_vencimento: d}); };
    const onChangeCompraDate = (e, d) => { setShowCompraPicker(false); if(d) setNewParcelamento({...newParcelamento, data_compra: d}); };
    const onChangePrimeiraParcelaDate = (e, d) => { setShowPrimeiraParcelaPicker(false); if(d) setNewParcelamento({...newParcelamento, data_primeira_parcela: d}); };
    const onChangeEditDate = (e, d) => { setShowEditDatePicker(false); if(d) setEditingExpense({...editingExpense, data_vencimento: d}); };

    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const years = Array.from({length: 10}, (_, i) => new Date().getFullYear() - 5 + i);

    // ==========================================
    // BLOCO DE ESTILOS (STYLESHEET)
    // ==========================================

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        title: { fontSize: 28, fontWeight: 'bold', margin: 20, textAlign: 'center', color: theme.text },
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        summaryCard: { marginHorizontal: 20, marginBottom: 10, backgroundColor: isDarkTheme ? '#1e303c' : '#e7f5ff', elevation: 2 },
        summaryCardContent: { alignItems: 'center', padding: 10 },
        summaryText: { fontSize: 16, color: isDarkTheme ? '#a5d3f2' : '#005f9e' },
        summaryValue: { fontSize: 24, fontWeight: 'bold', color: isDarkTheme ? '#a5d3f2' : '#005f9e' },
        menuContainer: { 
            paddingHorizontal: 20, 
            marginBottom: 10, 
            flexDirection: 'column', 
            alignItems: 'flex-start' 
        },
        filterLabel: { color: theme.text, fontSize: 13, marginBottom: 5, fontWeight: 'bold' },
        filterRow: { 
            flexDirection: Platform.OS === 'android' ? 'column' : 'row',
            alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
            gap: 12, marginTop: 10, width: '100%',
            justifyContent: Platform.OS === 'web' ? 'flex-end' : 'flex-start'
        },
        pickerWrapper: { 
            backgroundColor: isDarkTheme ? '#333333' : '#fff', borderRadius: 6, borderWidth: 1, 
            borderColor: theme.subText, overflow: 'hidden', justifyContent: 'center',
            width: Platform.OS === 'android' ? '100%' : 'auto',
            minWidth: Platform.OS === 'web' ? 120 : 'none'
        },
        webPicker: {
            backgroundColor: isDarkTheme ? '#333333' : '#fff', color: isDarkTheme ? '#fff' : '#000',
            border: 'none', padding: '8px', fontSize: '14px', outline: 'none', cursor: 'pointer',
            width: '100%'
        },
        menuAnchorButton: { backgroundColor: theme.cardBackground, elevation: 2, borderWidth: 1, borderColor: theme.subText },
        listContainer: { flex: 1, paddingHorizontal: 20 },
        expenseCard: { marginBottom: 10, elevation: 2, backgroundColor: theme.cardBackground },
        modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
        modalContent: { backgroundColor: theme.cardBackground, padding: 20, borderRadius: 10, width: '90%', elevation: 5 },
        modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: theme.text },
        input: { borderWidth: 1, borderColor: theme.subText, padding: 10, marginBottom: 10, borderRadius: 6, backgroundColor: isDarkTheme ? '#333' : '#fff', color: theme.text },
        datePickerButton: { width: '100%', padding: 10, borderWidth: 1, borderColor: theme.subText, borderRadius: 6, marginBottom: 10, justifyContent: 'center', alignItems: 'center' },
        picker: { color: isDarkTheme ? '#FFFFFF' : '#000000', backgroundColor: 'transparent', height: Platform.OS === 'android' ? 50 : 'auto' },
        pickerItem: { color: isDarkTheme ? '#FFFFFF' : '#000000' },
        fabSubButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBackground, padding: 10, borderRadius: 30, marginBottom: 10, elevation: 5 },
    });

    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.text} /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Minhas Despesas</Text>
            
            <Card style={styles.summaryCard}>
                <Card.Content style={styles.summaryCardContent}>
                    <Paragraph style={styles.summaryText}>
                        {selectedTab === 'all' ? `Total (${months[monthStart-1]}/${yearStart} até ${months[monthEnd-1]}/${yearEnd})` : 'Total Pago no Mês'}
                    </Paragraph>
                    <Title style={styles.summaryValue}>
                        R$ {filterExpenses().reduce((sum, d) => sum + parseFloat(d.valor), 0).toFixed(2)}
                    </Title>
                </Card.Content>
            </Card>

            <View style={styles.menuContainer}>
                <Menu visible={menuVisible} onDismiss={closeMenu} anchor={
                    <Button icon="chevron-down" mode="outlined" onPress={openMenu} style={styles.menuAnchorButton} labelStyle={{ color: theme.text }}>
                        {tabNames[selectedTab]}
                    </Button>
                }>
                    {Object.keys(tabNames).map(k => <Menu.Item key={k} onPress={() => selectTab(k)} title={tabNames[k]} />)}
                </Menu>

                {selectedTab === 'all' && (
                    <View style={styles.filterRow}>
                        <View style={Platform.OS === 'web' ? {flexDirection: 'row', alignItems: 'center', gap: 8} : {width: '100%'}}>
                            <Text style={styles.filterLabel}>De:</Text>
                            <View style={{flexDirection: 'row', gap: 4, width: Platform.OS === 'android' ? '100%' : 'auto'}}>
                                <View style={[styles.pickerWrapper, {flex: 1}]}>
                                    {Platform.OS === 'web' ? (
                                        <select value={monthStart} onChange={(e) => setMonthStart(parseInt(e.target.value))} style={styles.webPicker}>
                                            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                        </select>
                                    ) : (
                                        <Picker selectedValue={monthStart} style={styles.picker} dropdownIconColor={isDarkTheme ? "#FFF" : "#000"} onValueChange={(v) => setMonthStart(v)} mode="dropdown">
                                            {months.map((m, i) => <Picker.Item key={i} label={m} value={i + 1} color={isDarkTheme ? "#FFF" : "#000"} style={{ backgroundColor: isDarkTheme ? "#333" : "#fff" }} />)}
                                        </Picker>
                                    )}
                                </View>
                                <View style={[styles.pickerWrapper, {flex: 1.5}]}>
                                    {Platform.OS === 'web' ? (
                                        <select value={yearStart} onChange={(e) => setYearStart(parseInt(e.target.value))} style={styles.webPicker}>
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    ) : (
                                        <Picker selectedValue={yearStart} style={styles.picker} dropdownIconColor={isDarkTheme ? "#FFF" : "#000"} onValueChange={(v) => setYearStart(v)} mode="dropdown">
                                            {years.map(y => <Picker.Item key={y} label={String(y)} value={y} color={isDarkTheme ? "#FFF" : "#000"} style={{ backgroundColor: isDarkTheme ? "#333" : "#fff" }} />)}
                                        </Picker>
                                    )}
                                </View>
                            </View>
                        </View>
                        <View style={Platform.OS === 'web' ? {flexDirection: 'row', alignItems: 'center', gap: 8} : {width: '100%'}}>
                            <Text style={styles.filterLabel}>Até:</Text>
                            <View style={{flexDirection: 'row', gap: 4, width: Platform.OS === 'android' ? '100%' : 'auto'}}>
                                <View style={[styles.pickerWrapper, {flex: 1}]}>
                                    {Platform.OS === 'web' ? (
                                        <select value={monthEnd} onChange={(e) => setMonthEnd(parseInt(e.target.value))} style={styles.webPicker}>
                                            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                        </select>
                                    ) : (
                                        <Picker selectedValue={monthEnd} style={styles.picker} dropdownIconColor={isDarkTheme ? "#FFF" : "#000"} onValueChange={(v) => setMonthEnd(v)} mode="dropdown">
                                            {months.map((m, i) => <Picker.Item key={i} label={m} value={i + 1} color={isDarkTheme ? "#FFF" : "#000"} style={{ backgroundColor: isDarkTheme ? "#333" : "#fff" }} />)}
                                        </Picker>
                                    )}
                                </View>
                                <View style={[styles.pickerWrapper, {flex: 1.5}]}>
                                    {Platform.OS === 'web' ? (
                                        <select value={yearEnd} onChange={(e) => setYearEnd(parseInt(e.target.value))} style={styles.webPicker}>
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    ) : (
                                        <Picker selectedValue={yearEnd} style={styles.picker} dropdownIconColor={isDarkTheme ? "#FFF" : "#000"} onValueChange={(v) => setYearEnd(v)} mode="dropdown">
                                            {years.map(y => <Picker.Item key={y} label={String(y)} value={y} color={isDarkTheme ? "#FFF" : "#000"} style={{ backgroundColor: isDarkTheme ? "#333" : "#fff" }} />)}
                                        </Picker>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 140 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={theme.text} />}>
                {selectedTab === 'parcelados' ? (
                    parcelamentos.map(item => (
                        <Card key={item.id} style={styles.expenseCard}>
                            <Card.Title title={item.nome} left={(p) => <Ionicons {...p} name={getIconForCategory(getCategoryForParcelamento(item.id))} size={24} color={theme.text} />}
                                right={(p) => (
                                    <Menu visible={visibleParcelamentoMenu === item.id} onDismiss={closeParcelamentoMenu} anchor={<IconButton {...p} icon="dots-vertical" onPress={() => openParcelamentoMenu(item.id)} />}>
                                        <Menu.Item onPress={() => handleOpenEditParcelamentoModal(item)} title="Editar" />
                                        <Menu.Item onPress={() => handleDeleteParcelamento(item.id)} title="Excluir" titleStyle={{ color: theme.danger }} />
                                    </Menu>
                                )}
                            />
                            <Card.Content><Paragraph style={{ color: theme.text }}>Total: R$ {parseFloat(item.valor_total).toFixed(2)} | {item.numero_parcelas}x</Paragraph></Card.Content>
                        </Card>
                    ))
                ) : (
                    filterExpenses().map(despesa => (
                        <Card key={despesa.id} style={[styles.expenseCard, despesa.data_pagamento && { borderLeftWidth: 5, borderLeftColor: 'green' }]}>
                            <Card.Title title={despesa.nome} titleStyle={{ paddingTop: 10, color: theme.text }}
                                left={(p) => <Ionicons {...p} name={getIconForCategory(despesa.categoria)} size={24} color={theme.text} />}
                                right={(p) => (
                                    <Menu visible={visibleExpenseMenu === despesa.id} onDismiss={closeExpenseMenu} anchor={<IconButton {...p} icon="dots-vertical" onPress={() => openExpenseMenu(despesa.id)} />}>
                                        <Menu.Item onPress={() => handleOpenEditModal(despesa)} title="Editar" />
                                        <Menu.Item onPress={() => handleDeleteExpense(despesa.id)} title="Excluir" titleStyle={{ color: theme.danger }} />
                                    </Menu>
                                )} />
                            <Card.Content>
                                <Paragraph style={{ color: theme.subText }}>Valor: <Text style={{fontWeight: 'bold', color: theme.text}}>R$ {parseFloat(despesa.valor).toFixed(2)}</Text></Paragraph>
                                <Paragraph style={{ color: theme.subText }}>Vencimento: <Text style={{fontWeight: 'bold', color: theme.text}}>{formatToBR(despesa.data_vencimento)}</Text></Paragraph>
                                <Button mode={despesa.data_pagamento ? "outlined" : "contained"} onPress={() => handleTogglePaymentStatus(despesa)} style={{ marginTop: 10, backgroundColor: despesa.data_pagamento ? 'transparent' : theme.primary }} labelStyle={{color: despesa.data_pagamento ? 'green' : '#fff'}}>
                                    {despesa.data_pagamento ? "Paga" : "Marcar como Paga"}
                                </Button>
                            </Card.Content>
                        </Card>
                    ))
                )}
            </ScrollView>

            <FAB style={{ position: 'absolute', margin: 16, right: 0, bottom: 80, backgroundColor: theme.primary }} 
                icon="plus" 
                color="#fff" onPress={() => setExpenseModalVisible(true)} />

            {/* MODAL 1: NOVA DESPESA */}
            <Modal visible={expenseModalVisible} onRequestClose={() => setExpenseModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.modalTitle}>Nova Despesa</Text>
                        <TextInput style={styles.input} placeholder="Nome" value={newExpense.nome} onChangeText={(t) => setNewExpense({ ...newExpense, nome: t })} />
                        <TextInput style={styles.input} placeholder="Valor" keyboardType="numeric" value={newExpense.valor} onChangeText={(t) => setNewExpense({ ...newExpense, valor: t })} />
                        {Platform.OS === 'web' ? <WebDatePicker label="Vencimento" value={newExpense.data_vencimento} onChange={(e, d) => setNewExpense({...newExpense, data_vencimento: d})} /> : <TouchableOpacity onPress={() => setShowExpensePicker(true)} style={styles.datePickerButton}><Text style={{ color: theme.text }}>Vencimento: {newExpense.data_vencimento.toLocaleDateString()}</Text></TouchableOpacity>}
                        {showExpensePicker && Platform.OS !== 'web' && <DateTimePicker value={newExpense.data_vencimento} mode="date" display="default" onChange={onChangeExpenseDate} />}
                        <Picker selectedValue={newExpense.categoria} style={styles.picker} onValueChange={(v) => setNewExpense({ ...newExpense, categoria: v })}>{categorias.map(cat => <Picker.Item key={cat.id} label={cat.nome} value={cat.nome} />)}</Picker>
                        <Button mode="contained" onPress={handleAddExpense} style={{ marginBottom: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Salvar</Button>
                        <Button mode="outlined" onPress={() => setExpenseModalVisible(false)}>Cancelar</Button>
                    </ScrollView>
                </View>
            </Modal>

            {/* MODAL 2: EDITAR DESPESA */}
            <Modal visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar Despesa</Text>
                        <TextInput style={styles.input} value={editingExpense?.nome} onChangeText={(t) => setEditingExpense({ ...editingExpense, nome: t })} />
                        <TextInput style={styles.input} keyboardType="numeric" value={editingExpense?.valor} onChangeText={(t) => setEditingExpense({ ...editingExpense, valor: t })} />
                        <Picker selectedValue={editingExpense?.categoria} style={styles.picker} onValueChange={(v) => setEditingExpense({ ...editingExpense, categoria: v })}>{categorias.map(cat => <Picker.Item key={cat.id} label={cat.nome} value={cat.nome} />)}</Picker>
                        <Button mode="contained" onPress={handleUpdateExpense} style={{ marginBottom: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Salvar</Button>
                        <Button mode="outlined" onPress={() => setEditModalVisible(false)}>Cancelar</Button>
                    </ScrollView>
                </View>
            </Modal>

            {/* MODAL 3: CATEGORIAS */}
            <Modal visible={addCategoriaModalVisible} onRequestClose={() => setAddCategoriaModalVisible(false)} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Categorias</Text>
                        <View style={styles.newCategoriaContainer}>
                            <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="Nome" value={newCategoria.nome} onChangeText={(t) => setNewCategoria({ ...newCategoria, nome: t })} />
                            <TouchableOpacity style={styles.iconSelectButton} onPress={() => setIconListModalVisible(true)}><Ionicons name={newCategoria.icone || 'add-circle-outline'} size={28} color={theme.text} /></TouchableOpacity>
                            <IconButton icon="check-circle" size={30} onPress={handleAddCategoria} iconColor={theme.primary}/>
                        </View>
                        <ScrollView style={{maxHeight: 250}}>
                            {categorias.map(cat => (
                                <View key={cat.id} style={{flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 0.5, borderBottomColor: theme.subText}}>
                                    <View style={{flexDirection: 'row', alignItems: 'center'}}><Ionicons name={cat.icone} size={20} color={theme.text}/><Text style={{marginLeft: 10, color: theme.text}}>{cat.nome}</Text></View>
                                    <IconButton icon="delete" size={18} iconColor={theme.danger} onPress={() => handleDeleteCategoria(cat.id)}/>
                                </View>
                            ))}
                        </ScrollView>
                        <Button mode="outlined" onPress={() => setAddCategoriaModalVisible(false)} style={{ marginTop: 10 }}>Fechar</Button>
                    </View>
                </View>
            </Modal>

            {/* MODAL 4: SELECIONAR ÍCONE */}
            <Modal visible={iconListModalVisible} onRequestClose={() => setIconListModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, {height: '85%'}]}>
                        <Text style={styles.modalTitle}>Escolha um Ícone</Text>
                        <ScrollView contentContainerStyle={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center'}}>
                            {iconOptions.map((icon, index) => (
                                <TouchableOpacity key={index} style={{padding: 15}} onPress={() => { setNewCategoria({...newCategoria, icone: icon}); setIconListModalVisible(false); }}>
                                    <Ionicons name={icon} size={30} color={theme.text} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <Button mode="outlined" onPress={() => setIconListModalVisible(false)}>Voltar</Button>
                    </View>
                </View>
            </Modal>

            {/* MODAL 5: NOVO PARCELADO */}
            <Modal visible={parcelamentoModalVisible} onRequestClose={() => setParcelamentoModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.modalTitle}>Novo Parcelado</Text>
                        <TextInput style={styles.input} placeholder="Produto" value={newParcelamento.nome} onChangeText={(t) => setNewParcelamento({ ...newParcelamento, nome: t })} />
                        <TextInput style={styles.input} placeholder="Total" keyboardType="numeric" value={newParcelamento.valor_total} onChangeText={(t) => setNewParcelamento({ ...newParcelamento, valor_total: t })} />
                        <TextInput style={styles.input} placeholder="Parcelas" keyboardType="numeric" value={newParcelamento.numero_parcelas} onChangeText={(t) => setNewParcelamento({ ...newParcelamento, numero_parcelas: t })} />
                        <Button mode="contained" onPress={handleAddParcelamento} style={{ marginBottom: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Salvar</Button>
                        <Button mode="outlined" onPress={() => setParcelamentoModalVisible(false)}>Cancelar</Button>
                    </ScrollView>
                </View>
            </Modal>

            {/* MODAL 6: EDITAR PARCELAMENTO */}
            <Modal visible={editParcelamentoModalVisible} onRequestClose={() => setEditParcelamentoModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar Compra</Text>
                        <TextInput style={styles.input} value={editingParcelamento?.nome} onChangeText={(t) => setEditingParcelamento({ ...editingParcelamento, nome: t })} />
                        <Button mode="contained" onPress={handleUpdateParcelamento} style={{ marginBottom: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Salvar</Button>
                        <Button mode="outlined" onPress={() => setEditParcelamentoModalVisible(false)}>Cancelar</Button>
                    </View>
                </View>
            </Modal>

            {/* MODAL 7: DATA DE PAGAMENTO */}
            {showPaymentDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker value={new Date()} mode="date" display="default" onChange={handleMarkAsPaidWithDate} />
            )}
        </View>
    );
}

const iconOptions = [
    'fast-food-outline', 'home-outline', 'bus-outline', 'car-outline', 'bicycle-outline',
    'medkit-outline', 'fitness-outline', 'heart-outline', 'school-outline', 'book-outline',
    'happy-outline', 'game-controller-outline', 'tv-outline', 'shirt-outline',
    'cash-outline', 'wallet-outline', 'card-outline', 'basket-outline', 'hammer-outline',
    'briefcase-outline', 'airplane-outline', 'bandage-outline', 'barbell-outline',
    'beer-outline', 'brush-outline', 'build-outline', 'cafe-outline', 'camera-outline',
    'cart-outline', 'construct-outline', 'desktop-outline', 'ear-outline', 'egg-outline',
    'flash-outline', 'gift-outline', 'golf-outline', 'headset-outline', 'ice-cream-outline',
    'infinite-outline', 'key-outline', 'leaf-outline', 'library-outline', 'locate-outline',
    'lock-closed-outline', 'log-in-outline', 'mail-outline', 'map-outline', 'mic-outline',
    'moon-outline', 'musical-notes-outline', 'notifications-outline', 'paw-outline',
    'pencil-outline', 'phone-portrait-outline', 'pin-outline', 'play-outline', 'pricetag-outline',
    'print-outline', 'radio-outline', 'rainy-outline', 'restaurant-outline', 'rocket-outline',
    'save-outline', 'search-outline', 'settings-outline', 'share-social-outline', 'shield-outline',
    'skull-outline', 'snow-outline', 'sunny-outline', 'tablet-portrait-outline', 'thermometer-outline',
    'trash-outline', 'trophy-outline', 'umbrella-outline', 'videocam-outline', 'watch-outline',
    'water-outline', 'wifi-outline', 'wine-outline', 'woman-outline',
    'american-football-outline', 'analytics-outline', 'apps-outline', 'archive-outline',
    'at-outline', 'attach-outline', 'backspace-outline', 'balloon-outline', 'barcode-outline',
    'baseball-outline', 'basketball-outline', 'battery-charging-outline', 'beaker-outline',
    'bed-outline', 'bluetooth-outline', 'body-outline', 'bonfire-outline', 'bowling-ball-outline',
    'calculator-outline', 'calendar-outline', 'call-outline', 'card-outline', 'chatbox-outline'
];
