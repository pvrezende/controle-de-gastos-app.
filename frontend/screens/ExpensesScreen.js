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
    const [selectedTab, setSelectedTab] = useState('current');
    const [parcelamentos, setParcelamentos] = useState([]);
    const [fabOpen, setFabOpen] = useState(false);
    const [totalPagoMes, setTotalPagoMes] = useState(0);
    const [totalPagoGeral, setTotalPagoGeral] = useState(0);

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

    // FUNÇÃO QUE RESOLVE O FUSO HORÁRIO DE MANAUS
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

    // FUNÇÕES DE CONTROLE DE MENU
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
        current: 'Mês Atual',
        future: 'Próximos',
        overdue: 'Atrasadas',
        paid: 'Pagas',
        parcelados: 'Parcelados',
    };

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
            const todasDespesas = despesasResponse.data;
            setDespesas(todasDespesas);
            setParcelamentos(parcelamentosResponse.data);
            const hoje = new Date();
            const mesAtual = hoje.getMonth() + 1;
            const anoAtual = hoje.getFullYear();

            const totalPagoNoMes = todasDespesas
                .filter(d => {
                    if (!d.data_pagamento) return false;
                    const p = d.data_pagamento.split('T')[0].split('-');
                    return parseInt(p[1]) === mesAtual && parseInt(p[0]) === anoAtual;
                })
                .reduce((sum, d) => sum + parseFloat(d.valor), 0);
            setTotalPagoMes(totalPagoNoMes);

            const totalGeralPago = todasDespesas
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

    const handleAddExpense = async () => {
        if (!newExpense.nome || !newExpense.valor || !newExpense.data_vencimento || !newExpense.categoria) {
            Alert.alert('Erro', 'Preencha todos os campos.'); return;
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
            Alert.alert('Erro', 'Preencha todos os campos.'); return;
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
            Alert.alert('Erro', 'Nome e ícone são obrigatórios.'); return;
        }
        try {
            await api.post('/categorias', newCategoria);
            setAddCategoriaModalVisible(false);
            setNewCategoria({ nome: '', icone: '' });
            fetchCategorias();
        } catch (error) { console.error(error); }
    };

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
                Alert.alert("Remover Pagamento", "Marcar como pendente?", [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Sim", onPress: setPendente }
                ]);
            }
        } else {
            if (Platform.OS === 'web') {
                const h = new Date();
                const hf = `${String(h.getDate()).padStart(2, '0')}/${String(h.getMonth() + 1).padStart(2, '0')}/${h.getFullYear()}`;
                const inputDate = window.prompt("Data do pagamento (DD/MM/AAAA):", hf);
                if (inputDate) {
                    const p = inputDate.split('/');
                    if (p.length === 3) {
                        try {
                            await api.put(`/despesas/${despesa.id}/pagar`, { data_pagamento: `${p[2]}-${p[1]}-${p[0]}` });
                            fetchData();
                        } catch (e) { alert("Erro ao salvar."); }
                    } else { alert("Formato inválido! Use DD/MM/AAAA."); }
                }
            } else {
                setSelectedExpenseToPay(despesa);
                setShowPaymentDatePicker(true);
            }
        }
    };

    const handleDeleteExpense = (id) => {
        closeExpenseMenu();
        const del = async () => { try { await api.delete(`/despesas/${id}`); fetchData(); } catch (e) {} };
        if (Platform.OS === 'web') { if (window.confirm("Excluir despesa?")) del(); }
        else { Alert.alert("Confirmar", "Excluir?", [{text:"Não"},{text:"Sim", onPress: del}]); }
    };

    const handleOpenEditModal = (expense) => {
        const p = expense.data_vencimento.split('T')[0].split('-');
        setEditingExpense({ ...expense, valor: String(expense.valor), data_vencimento: new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]), 12, 0, 0) });
        setEditModalVisible(true);
        closeExpenseMenu();
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

    const handleDeleteCategoria = (id) => {
        const delCat = async () => { try { await api.delete(`/categorias/${id}`); fetchCategorias(); } catch (e) {} };
        if (Platform.OS === 'web') { if(window.confirm("Excluir categoria?")) delCat(); }
        else { Alert.alert("Confirmar", "Excluir?", [{text:"Não"}, {text:"Sim", onPress: delCat}]); }
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

    const handleDeleteParcelamento = (id) => {
        closeParcelamentoMenu();
        const delP = async () => { try { await api.delete(`/parcelamentos/${id}`); fetchData(); } catch (e) {} };
        if (Platform.OS === 'web') { if(window.confirm("Excluir todas as parcelas?")) delP(); }
        else { Alert.alert("Confirmar", "Excluir todas as parcelas?", [{text:"Não"}, {text:"Sim", onPress: delP}]); }
    };

    const filterExpenses = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return despesas.filter(despesa => {
            const p = despesa.data_vencimento.split('T')[0].split('-');
            const dueDate = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]), 12, 0, 0);
            if (selectedTab === 'current') return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
            if (selectedTab === 'future') return dueDate > today;
            if (selectedTab === 'overdue') return dueDate < today && despesa.data_pagamento === null;
            if (selectedTab === 'paid') return despesa.data_pagamento !== null;
            return false;
        });
    };

    const selectTab = (tab) => { closeMenu(); setTimeout(() => setSelectedTab(tab), 100); };
    const getIconForCategory = (name) => { const c = categorias.find(cat => cat.nome === name); return c ? c.icone : 'help-circle-outline'; };
    const getCategoryForParcelamento = (id) => { const d = despesas.find(d => d.compra_parcelada_id === id); return d ? d.categoria : 'outros'; };

    const onChangeExpenseDate = (e, d) => { setShowExpensePicker(false); if(d) setNewExpense({...newExpense, data_vencimento: d}); };
    const onChangeCompraDate = (e, d) => { setShowCompraPicker(false); if(d) setNewParcelamento({...newParcelamento, data_compra: d}); };
    const onChangePrimeiraParcelaDate = (e, d) => { setShowPrimeiraParcelaPicker(false); if(d) setNewParcelamento({...newParcelamento, data_primeira_parcela: d}); };
    const onChangeEditDate = (e, d) => { setShowEditDatePicker(false); if(d) setEditingExpense({...editingExpense, data_vencimento: d}); };

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        title: { fontSize: 28, fontWeight: 'bold', margin: 20, textAlign: 'center', color: theme.text },
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        summaryCard: { marginHorizontal: 20, marginBottom: 10, backgroundColor: isDarkTheme ? '#1e303c' : '#e7f5ff', elevation: 2 },
        summaryCardContent: { alignItems: 'center', padding: 10 },
        summaryText: { fontSize: 16, color: isDarkTheme ? '#a5d3f2' : '#005f9e' },
        summaryValue: { fontSize: 24, fontWeight: 'bold', color: isDarkTheme ? '#a5d3f2' : '#005f9e' },
        menuContainer: { paddingHorizontal: 20, marginBottom: 20, alignItems: 'flex-start' },
        menuAnchorButton: { backgroundColor: theme.cardBackground, elevation: 2, borderWidth: 1, borderColor: theme.subText },
        listContainer: { flex: 1, paddingHorizontal: 20 },
        expenseCard: { marginBottom: 10, elevation: 2, backgroundColor: theme.cardBackground },
        noDataText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: theme.subText },
        modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
        modalContent: { backgroundColor: theme.cardBackground, padding: 20, borderRadius: 10, width: '90%', elevation: 5 },
        modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: theme.text },
        input: { borderWidth: 1, borderColor: theme.subText, padding: 10, marginBottom: 10, borderRadius: 6, backgroundColor: isDarkTheme ? '#333' : '#fff', color: theme.text },
        datePickerButton: { width: '100%', padding: 10, borderWidth: 1, borderColor: theme.subText, borderRadius: 6, marginBottom: 10, justifyContent: 'center', alignItems: 'center' },
        picker: { color: theme.text, backgroundColor: theme.cardBackground },
        iconListModalContent: { backgroundColor: theme.cardBackground, padding: 20, borderRadius: 10, width: '90%', elevation: 5, height: '80%' },
        iconListContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
        iconOption: { padding: 10, margin: 5, borderWidth: 1, borderColor: theme.subText, borderRadius: 8 },
        categoriaListContainer: { maxHeight: 200, width: '100%', borderWidth: 1, borderColor: theme.subText, borderRadius: 6, marginTop: 10 },
        categoriaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: theme.subText },
        categoriaName: { fontSize: 16, color: theme.text },
        newCategoriaContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
        iconSelectButton: { borderWidth: 1, borderColor: theme.subText, borderRadius: 6, padding: 5, justifyContent: 'center', alignItems: 'center' },
    });

    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.text} /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Minhas Despesas</Text>
            <Card style={styles.summaryCard}>
                <Card.Content style={styles.summaryCardContent}>
                    <Paragraph style={styles.summaryText}>Total Pago no Mês</Paragraph>
                    <Title style={styles.summaryValue}>R$ {totalPagoMes.toFixed(2)}</Title>
                </Card.Content>
            </Card>

            <View style={styles.menuContainer}>
                <Menu visible={menuVisible} onDismiss={closeMenu} anchor={<Button icon="chevron-down" mode="outlined" onPress={openMenu} style={styles.menuAnchorButton} labelStyle={{ color: theme.text }}>{tabNames[selectedTab]}</Button>}>
                    {Object.keys(tabNames).map(k => <Menu.Item key={k} onPress={() => selectTab(k)} title={tabNames[k]} />)}
                </Menu>
            </View>

            <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 140 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={theme.text} />}>
                {selectedTab === 'parcelados' ? (
                    parcelamentos.map(item => (
                        <Card key={item.id} style={styles.expenseCard}>
                            <Card.Title title={item.nome} titleStyle={{ paddingTop: 10, color: theme.text }}
                                left={(p) => <Ionicons {...p} name={getIconForCategory(getCategoryForParcelamento(item.id))} size={24} color={theme.text} />}
                                right={(p) => (
                                    <Menu visible={visibleParcelamentoMenu === item.id} onDismiss={closeParcelamentoMenu} anchor={<IconButton {...p} icon="dots-vertical" onPress={() => openParcelamentoMenu(item.id)} />}>
                                        <Menu.Item onPress={() => handleOpenEditParcelamentoModal(item)} title="Editar" />
                                        <Menu.Item onPress={() => handleDeleteParcelamento(item.id)} title="Excluir" titleStyle={{ color: theme.danger }} />
                                    </Menu>
                                )}
                            />
                            <Card.Content>
                                <Paragraph style={{ color: theme.text }}>Total: R$ {parseFloat(item.valor_total).toFixed(2)} | {item.numero_parcelas}x</Paragraph>
                            </Card.Content>
                        </Card>
                    ))
                ) : (
                    <>
                        {selectedTab === 'paid' && (
                            <Card style={[styles.summaryCard, { backgroundColor: isDarkTheme ? '#1c301c' : '#e8f5e9', marginHorizontal: 0, marginBottom: 15 }]}>
                                <Card.Content style={styles.summaryCardContent}>
                                    <Paragraph style={[styles.summaryText, { color: isDarkTheme ? '#a1d9a1' : '#1b5e20' }]}>Total Pago Histórico</Paragraph>
                                    <Title style={[styles.summaryValue, { color: isDarkTheme ? '#a1d9a1' : '#1b5e20' }]}>R$ {totalPagoGeral.toFixed(2)}</Title>
                                </Card.Content>
                            </Card>
                        )}
                        {filterExpenses().map(despesa => (
                            <Card key={despesa.id} style={styles.expenseCard}>
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
                                    {despesa.data_pagamento && (<Paragraph style={{ fontWeight: 'bold', color: 'green', marginTop: 8 }}>Pago em: {formatToBR(despesa.data_pagamento)}</Paragraph>)}
                                </Card.Content>
                            </Card>
                        ))}
                    </>
                )}
            </ScrollView>

            {showPaymentDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker value={new Date()} mode="date" display="default" onChange={handleMarkAsPaidWithDate} />
            )}

            <View style={{ position: 'absolute', bottom: 25, right: 25, alignItems: 'center' }}>
                {fabOpen && (
                    <View style={{ marginBottom: 10, alignItems: 'flex-end' }}>
                        <TouchableOpacity onPress={() => { setAddCategoriaModalVisible(true); setFabOpen(false); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBackground, padding: 10, borderRadius: 30, marginBottom: 10, elevation: 5 }}>
                            <Ionicons name="list-box-outline" size={22} color={theme.text} style={{ marginRight: 8 }} /><Text style={{ color: theme.text, fontWeight: '500' }}>Categorias</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setParcelamentoModalVisible(true); setFabOpen(false); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBackground, padding: 10, borderRadius: 30, marginBottom: 10, elevation: 5 }}>
                            <Ionicons name="card-outline" size={22} color={theme.text} style={{ marginRight: 8 }} /><Text style={{ color: theme.text, fontWeight: '500' }}>Parcelado</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setExpenseModalVisible(true); setFabOpen(false); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBackground, padding: 10, borderRadius: 30, marginBottom: 10, elevation: 5 }}>
                            <Ionicons name="cash-outline" size={22} color={theme.text} style={{ marginRight: 8 }} /><Text style={{ color: theme.text, fontWeight: '500' }}>Nova Despesa</Text>
                        </TouchableOpacity>
                    </View>
                )}
                <TouchableOpacity onPress={() => setFabOpen(!fabOpen)} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: fabOpen ? theme.danger : theme.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 }}>
                    <Ionicons name={fabOpen ? 'close' : 'add'} size={32} color="#fff" />
                </TouchableOpacity>
            </View>

            <Modal visible={expenseModalVisible} onRequestClose={() => setExpenseModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.modalTitle}>Nova Despesa</Text>
                        <TextInput style={styles.input} placeholder="Nome" value={newExpense.nome} onChangeText={(t) => setNewExpense({ ...newExpense, nome: t })} />
                        <TextInput style={styles.input} placeholder="Valor" keyboardType="numeric" value={newExpense.valor} onChangeText={(t) => setNewExpense({ ...newExpense, valor: t })} />
                        <TouchableOpacity onPress={() => setShowExpensePicker(true)} style={styles.datePickerButton}><Text style={{ color: theme.text }}>Vencimento: {newExpense.data_vencimento.toLocaleDateString()}</Text></TouchableOpacity>
                        {showExpensePicker && <DateTimePicker value={newExpense.data_vencimento} mode="date" display="default" onChange={onChangeExpenseDate} />}
                        <Picker selectedValue={newExpense.categoria} style={styles.picker} onValueChange={(v) => setNewExpense({ ...newExpense, categoria: v })}>{categorias.map(cat => <Picker.Item key={cat.id} label={cat.nome} value={cat.nome} />)}</Picker>
                        <Button mode="contained" onPress={handleAddExpense} style={{ marginBottom: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Salvar</Button>
                        <Button mode="outlined" onPress={() => setExpenseModalVisible(false)}>Cancelar</Button>
                    </ScrollView>
                </View>
            </Modal>

            <Modal visible={parcelamentoModalVisible} onRequestClose={() => setParcelamentoModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.modalTitle}>Novo Parcelado</Text>
                        <TextInput style={styles.input} placeholder="Produto" value={newParcelamento.nome} onChangeText={(t) => setNewParcelamento({ ...newParcelamento, nome: t })} />
                        <TextInput style={styles.input} placeholder="Total" keyboardType="numeric" value={newParcelamento.valor_total} onChangeText={(t) => setNewParcelamento({ ...newParcelamento, valor_total: t })} />
                        <TextInput style={styles.input} placeholder="Parcelas" keyboardType="numeric" value={newParcelamento.numero_parcelas} onChangeText={(t) => setNewParcelamento({ ...newParcelamento, numero_parcelas: t })} />
                        <TouchableOpacity onPress={() => setShowCompraPicker(true)} style={styles.datePickerButton}><Text style={{ color: theme.text }}>Compra: {newParcelamento.data_compra.toLocaleDateString()}</Text></TouchableOpacity>
                        {showCompraPicker && <DateTimePicker value={newParcelamento.data_compra} mode="date" display="default" onChange={onChangeCompraDate} />}
                        <TouchableOpacity onPress={() => setShowPrimeiraParcelaPicker(true)} style={styles.datePickerButton}><Text style={{ color: theme.text }}>1ª Parcela: {newParcelamento.data_primeira_parcela.toLocaleDateString()}</Text></TouchableOpacity>
                        {showPrimeiraParcelaPicker && <DateTimePicker value={newParcelamento.data_primeira_parcela} mode="date" display="default" onChange={onChangePrimeiraParcelaDate} />}
                        <Button mode="contained" onPress={handleAddParcelamento} style={{ marginBottom: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Salvar</Button>
                        <Button mode="outlined" onPress={() => setParcelamentoModalVisible(false)}>Cancelar</Button>
                    </ScrollView>
                </View>
            </Modal>

            <Modal visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar Despesa</Text>
                        <TextInput style={styles.input} value={editingExpense?.nome} onChangeText={(t) => setEditingExpense({ ...editingExpense, nome: t })} />
                        <TextInput style={styles.input} keyboardType="numeric" value={editingExpense?.valor} onChangeText={(t) => setEditingExpense({ ...editingExpense, valor: t })} />
                        <TouchableOpacity onPress={() => setShowEditDatePicker(true)} style={styles.datePickerButton}><Text style={{ color: theme.text }}>Data: {editingExpense?.data_vencimento.toLocaleDateString()}</Text></TouchableOpacity>
                        {showEditDatePicker && <DateTimePicker value={editingExpense?.data_vencimento} mode="date" display="default" onChange={onChangeEditDate} />}
                        <Picker selectedValue={editingExpense?.categoria} style={styles.picker} onValueChange={(v) => setEditingExpense({ ...editingExpense, categoria: v })}>{categorias.map(cat => <Picker.Item key={cat.id} label={cat.nome} value={cat.nome} />)}</Picker>
                        <Button mode="contained" onPress={handleUpdateExpense} style={{ marginBottom: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Salvar</Button>
                        <Button mode="outlined" onPress={() => setEditModalVisible(false)}>Cancelar</Button>
                    </ScrollView>
                </View>
            </Modal>

            <Modal visible={editParcelamentoModalVisible} onRequestClose={() => setEditParcelamentoModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar Compra</Text>
                        <TextInput style={styles.input} value={editingParcelamento?.nome} onChangeText={(t) => setEditingParcelamento({ ...editingParcelamento, nome: t })} />
                        <Picker selectedValue={editingParcelamento?.categoria} style={styles.picker} onValueChange={(v) => setEditingParcelamento({ ...editingParcelamento, categoria: v })}>{categorias.map(cat => <Picker.Item key={cat.id} label={cat.nome} value={cat.nome} />)}</Picker>
                        <Button mode="contained" onPress={handleUpdateParcelamento} style={{ marginBottom: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Salvar</Button>
                        <Button mode="outlined" onPress={() => setEditParcelamentoModalVisible(false)}>Cancelar</Button>
                    </View>
                </View>
            </Modal>

            <Modal visible={addCategoriaModalVisible} onRequestClose={() => setAddCategoriaModalVisible(false)} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Categorias</Text>
                        <View style={styles.newCategoriaContainer}>
                            <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="Nome" value={newCategoria.nome} onChangeText={(t) => setNewCategoria({ ...newCategoria, nome: t })} />
                            <TouchableOpacity style={styles.iconSelectButton} onPress={() => setIconListModalVisible(true)}><Ionicons name={newCategoria.icone || 'add-circle-outline'} size={28} color={theme.text} /></TouchableOpacity>
                            <IconButton icon="check-circle" size={30} onPress={handleAddCategoria} iconColor={theme.primary}/>
                        </View>
                        <ScrollView style={styles.categoriaListContainer}>
                            {categorias.map(cat => (
                                <View key={cat.id} style={styles.categoriaRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name={cat.icone} size={24} color={theme.text} style={{ marginRight: 10 }} /><Text style={styles.categoriaName}>{cat.nome}</Text></View>
                                    <IconButton icon="delete" size={20} iconColor={theme.danger} onPress={() => handleDeleteCategoria(cat.id)} />
                                </View>
                            ))}
                        </ScrollView>
                        <Button mode="outlined" onPress={() => setAddCategoriaModalVisible(false)} style={{ marginTop: 10 }}>Fechar</Button>
                    </View>
                </View>
            </Modal>

            <Modal visible={editCategoriaModalVisible} onRequestClose={() => setEditCategoriaModalVisible(false)} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar Categoria</Text>
                        <TextInput style={styles.input} value={editingCategoria?.nome} onChangeText={(t) => setEditingCategoria({ ...editingCategoria, nome: t })} />
                        <TouchableOpacity style={styles.iconSelectButton} onPress={() => setIconListModalVisible(true)}><Ionicons name={editingCategoria?.icone || 'add-circle-outline'} size={30} color={theme.text} /></TouchableOpacity>
                        <Button mode="contained" onPress={handleUpdateCategoria} style={{ marginTop: 15, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Salvar</Button>
                        <Button mode="outlined" onPress={() => setEditCategoriaModalVisible(false)} style={{ marginTop: 10 }}>Cancelar</Button>
                    </View>
                </View>
            </Modal>

            <Modal visible={iconListModalVisible} onRequestClose={() => setIconListModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.iconListModalContent}>
                        <Text style={styles.modalTitle}>Selecione Ícone</Text>
                        <ScrollView contentContainerStyle={styles.iconListContainer}>
                            {iconOptions.map((icon, index) => (
                                <TouchableOpacity key={index} style={styles.iconOption} onPress={() => {
                                    if (addCategoriaModalVisible) setNewCategoria({ ...newCategoria, icone: icon });
                                    else if (editCategoriaModalVisible) setEditingCategoria({ ...editingCategoria, icone: icon });
                                    setIconListModalVisible(false);
                                }}><Ionicons name={icon} size={30} color={theme.text} /></TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const iconOptions = [
    'fast-food-outline', 'home-outline', 'bus-outline', 'car-outline', 'bicycle-outline',
    'medkit-outline', 'fitness-outline', 'heart-outline', 'school-outline', 'book-outline',
    'happy-outline', 'game-controller-outline', 'tv-outline', 'shirt-outline',
    'cash-outline', 'wallet-outline', 'card-outline', 'basket-outline',
];