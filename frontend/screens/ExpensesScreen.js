// frontend/screens/ExpensesScreen.js
import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
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
    Dimensions, 
    Animated 
} from 'react-native';
import { Card, Title, Paragraph, Button, FAB, Menu, IconButton } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

const CustomDatePicker = ({ value, onChange, label, theme, isDarkTheme, showPicker, setShowPicker }) => {
    if (Platform.OS === 'web') {
        return (
            <View style={{ marginBottom: 15, width: '100%' }}>
                <Text style={{ color: theme.text, marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>{label}:</Text>
                <input
                    type="date"
                    value={value instanceof Date ? value.toISOString().split('T')[0] : ""}
                    onChange={(e) => {
                        const selectedDate = new Date(e.target.value + 'T12:00:00');
                        onChange(null, selectedDate);
                    }}
                    style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${theme.subText}`,
                        backgroundColor: isDarkTheme ? '#2c2c2c' : '#fff',
                        color: isDarkTheme ? '#fff' : '#000',
                        width: '100%',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />
            </View>
        );
    }

    return (
        <View style={{ marginBottom: 15 }}>
            <Text style={{ color: theme.text, marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>{label}:</Text>
            <TouchableOpacity 
                onPress={() => setShowPicker(true)} 
                style={[styles.input, { justifyContent: 'center', height: 50, borderColor: theme.subText, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 }]}
            >
                <Text style={{ color: theme.text }}>{value.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            {showPicker && (
                <DateTimePicker 
                    value={value} 
                    mode="date" 
                    display="default" 
                    onChange={(e, d) => { setShowPicker(false); if(d) onChange(e, d); }} 
                />
            )}
        </View>
    );
};

export default function ExpensesScreen({ route, navigation }) {
    const { api } = useContext(AuthContext);
    const { theme, isDarkTheme } = useContext(ThemeContext);
    
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('all'); 
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const animationController = useRef(new Animated.Value(0)).current;

    const [monthStart, setMonthStart] = useState(new Date().getMonth() + 1);
    const [yearStart, setYearStart] = useState(new Date().getFullYear());
    const [monthEnd, setMonthEnd] = useState(new Date().getMonth() + 1);
    const [yearEnd, setYearEnd] = useState(new Date().getFullYear());

    const [expenseModalVisible, setExpenseModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentExpenseId, setCurrentExpenseId] = useState(null);
    const [formData, setFormData] = useState({ nome: '', valor: '', data_vencimento: new Date(), categoria: 'outros' });
    
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    const toggleFilters = () => {
        const toValue = isFilterVisible ? 0 : 1;
        Animated.timing(animationController, { toValue, duration: 300, useNativeDriver: false }).start();
        setIsFilterVisible(!isFilterVisible);
    };

    const filterHeight = animationController.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Platform.OS === 'web' ? (screenWidth < 768 ? 400 : 180) : 280] 
    });

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const [despRes, catRes] = await Promise.all([api.get('/despesas'), api.get('/categorias')]);
            setDespesas(despRes.data);
            setCategorias(catRes.data);
        } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    const getFilteredData = () => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        return despesas.filter(d => {
            const p = d.data_vencimento.split('T')[0].split('-');
            const dueDate = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]), 12, 0, 0);

            if (selectedTab === 'all') {
                const start = new Date(yearStart, monthStart - 1, 1, 0, 0, 0);
                const end = new Date(yearEnd, monthEnd, 0, 23, 59, 59);
                return dueDate >= start && dueDate <= end;
            }
            if (selectedTab === 'current') return parseInt(p[1]) === (hoje.getMonth() + 1) && parseInt(p[0]) === hoje.getFullYear();
            if (selectedTab === 'overdue') return dueDate < hoje && d.data_pagamento === null;
            if (selectedTab === 'paid') return d.data_pagamento !== null;
            if (selectedTab === 'parcelados') return d.compra_parcelada_id !== null;
            return true;
        });
    };

    const handleSaveExpense = async () => {
        if (!formData.nome || !formData.valor) return;
        const payload = { 
            ...formData, 
            valor: parseFloat(formData.valor), 
            data_vencimento: formData.data_vencimento.toISOString().split('T')[0] 
        };

        try {
            if (isEditing) {
                await api.put(`/despesas/${currentExpenseId}`, payload);
            } else {
                await api.post('/despesas', payload);
            }
            setExpenseModalVisible(false);
            fetchData();
        } catch (e) { Alert.alert("Erro", "Falha ao salvar"); }
    };

    const openEdit = (item) => {
        setIsEditing(true);
        setCurrentExpenseId(item.id);
        setFormData({
            nome: item.nome,
            valor: String(item.valor),
            data_vencimento: new Date(item.data_vencimento),
            categoria: item.categoria
        });
        setExpenseModalVisible(true);
    };

    const handleDelete = (id) => {
        const del = async () => { try { await api.delete(`/despesas/${id}`); fetchData(); } catch (e) {} };
        if (Platform.OS === 'web') { if(confirm("Excluir?")) del(); }
        else { Alert.alert("Excluir", "Tem certeza?", [{text: "Não"}, {text: "Sim", onPress: del}]); }
    };

    const togglePayment = async (item) => {
        try {
            const data = item.data_pagamento ? null : new Date().toISOString().split('T')[0];
            await api.put(`/despesas/${item.id}/pagar`, { data_pagamento: data });
            fetchData();
        } catch (e) {}
    };

    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const years = Array.from({length: 10}, (_, i) => new Date().getFullYear() - 5 + i);

    const renderPicker = (val, setVal, items, label) => (
        <View style={styles.pickerContainer}>
            <View style={[styles.pickerWrapper, { backgroundColor: isDarkTheme ? '#333' : '#fff' }]}>
                {Platform.OS === 'web' ? (
                    <select 
                        value={val} 
                        onChange={(e) => setVal(parseInt(e.target.value))}
                        style={{ background: 'transparent', color: theme.text, border: 'none', padding: '10px', width: '100%', cursor: 'pointer', outline: 'none' }}
                    >
                        {items.map((item, idx) => (
                            <option key={idx} value={typeof item === 'string' && items.length === 12 ? idx + 1 : item}>
                                {item}
                            </option>
                        ))}
                    </select>
                ) : (
                    <Picker
                        selectedValue={val}
                        onValueChange={(v) => setVal(v)}
                        style={{ color: theme.text, height: 50, width: '100%' }}
                        dropdownIconColor={theme.text}
                        mode="dropdown"
                    >
                        {items.map((item, idx) => (
                            <Picker.Item 
                                key={idx} 
                                label={String(item)} 
                                value={typeof item === 'string' && items.length === 12 ? idx + 1 : item} 
                                color={isDarkTheme ? "#FFF" : "#000"}
                                style={{ backgroundColor: isDarkTheme ? "#333" : "#FFF" }}
                            />
                        ))}
                    </Picker>
                )}
            </View>
        </View>
    );

    const tabNames = { 
        all: 'Geral (Filtro)', 
        current: 'Mês Atual', 
        overdue: 'Atrasadas', 
        paid: 'Pagas',
        parcelados: 'Parcelados'
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Minhas Despesas</Text>

            <Card style={[styles.summaryCard, { backgroundColor: isDarkTheme ? '#1e1e1e' : '#f0f7ff' }]}>
                <Card.Content>
                    <Text style={{ color: theme.subText }}>{tabNames[selectedTab]}</Text>
                    <Title style={{ fontSize: 28, color: theme.primary }}>
                        R$ {getFilteredData().reduce((s, d) => s + parseFloat(d.valor), 0).toFixed(2)}
                    </Title>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Pago: R$ {getFilteredData().filter(d => d.data_pagamento).reduce((s, d) => s + parseFloat(d.valor), 0).toFixed(2)}</Text>
                        <Text style={{ color: theme.danger, fontWeight: 'bold' }}>Pendente: R$ {getFilteredData().filter(d => !d.data_pagamento).reduce((s, d) => s + parseFloat(d.valor), 0).toFixed(2)}</Text>
                    </View>
                </Card.Content>
            </Card>

            <View style={styles.filterSection}>
                <Menu
                    visible={menuVisible}
                    onDismiss={() => setMenuVisible(false)}
                    anchor={<Button mode="outlined" onPress={() => setMenuVisible(true)} icon="filter">{tabNames[selectedTab]}</Button>}
                >
                    {Object.keys(tabNames).map(k => <Menu.Item key={k} onPress={() => { setSelectedTab(k); setMenuVisible(false); }} title={tabNames[k]} />)}
                </Menu>
                {selectedTab === 'all' && <IconButton icon={isFilterVisible ? "chevron-up" : "calendar-range"} onPress={toggleFilters} />}
            </View>

            <Animated.View style={[styles.filterDrawer, { height: filterHeight }]}>
                <View style={styles.filterGrid}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.sectionLabel, { color: theme.primary }]}>DE:</Text>
                        <View style={{ flexDirection: 'row', gap: 5 }}>
                            {renderPicker(monthStart, setMonthStart, months, "")}
                            {renderPicker(yearStart, setYearStart, years, "")}
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.sectionLabel, { color: theme.primary }]}>ATÉ:</Text>
                        <View style={{ flexDirection: 'row', gap: 5 }}>
                            {renderPicker(monthEnd, setMonthEnd, months, "")}
                            {renderPicker(yearEnd, setYearEnd, years, "")}
                        </View>
                    </View>
                </View>
                <Button mode="contained" onPress={toggleFilters} style={{ marginTop: 15 }}>Aplicar Filtros</Button>
            </Animated.View>

            <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}>
                {getFilteredData().map(item => (
                    <Card key={item.id} style={[styles.expenseCard, { backgroundColor: theme.cardBackground, borderLeftColor: item.data_pagamento ? '#4CAF50' : theme.danger }]}>
                        <Card.Title 
                            title={item.nome} 
                            titleStyle={{ color: theme.text }}
                            subtitle={`Vencimento: ${item.data_vencimento.split('T')[0].split('-').reverse().join('/')}`}
                            right={(p) => (
                                <View style={{ flexDirection: 'row' }}>
                                    <IconButton {...p} icon="pencil-outline" iconColor={theme.primary} onPress={() => openEdit(item)} />
                                    <IconButton {...p} icon="delete-outline" iconColor={theme.danger} onPress={() => handleDelete(item.id)} />
                                </View>
                            )}
                        />
                        <Card.Content>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>R$ {parseFloat(item.valor).toFixed(2)}</Text>
                            <Button 
                                mode={item.data_pagamento ? "outlined" : "contained"} 
                                style={{ marginTop: 10, borderColor: item.data_pagamento ? '#4CAF50' : 'transparent' }}
                                color={item.data_pagamento ? '#4CAF50' : theme.primary}
                                onPress={() => togglePayment(item)}
                            >
                                {item.data_pagamento ? "PAGA ✅" : "MARCAR COMO PAGA"}
                            </Button>
                        </Card.Content>
                    </Card>
                ))}
            </ScrollView>

            <FAB 
                style={[styles.fab, { backgroundColor: theme.primary }]} 
                icon="plus" 
                onPress={() => { setIsEditing(false); setFormData({ nome: '', valor: '', data_vencimento: new Date(), categoria: 'outros' }); setExpenseModalVisible(true); }} 
            />

            <Modal visible={expenseModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                        <Title style={{ color: theme.text, textAlign: 'center' }}>{isEditing ? 'Editar Despesa' : 'Nova Despesa'}</Title>
                        
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.subText }]} placeholder="Nome" placeholderTextColor={theme.subText} value={formData.nome} onChangeText={t => setFormData({...formData, nome: t})} />
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.subText }]} placeholder="Valor" placeholderTextColor={theme.subText} keyboardType="numeric" value={formData.valor} onChangeText={t => setFormData({...formData, valor: t})} />
                        
                        <CustomDatePicker 
                            label="Data de Vencimento" 
                            value={formData.data_vencimento} 
                            onChange={(e, d) => setFormData({...formData, data_vencimento: d})} 
                            theme={theme} 
                            isDarkTheme={isDarkTheme}
                            showPicker={showDatePicker}
                            setShowPicker={setShowDatePicker}
                        />

                        <View style={styles.modalButtons}>
                            <Button mode="contained" onPress={handleSaveExpense} style={{ flex: 1 }}>Salvar</Button>
                            <Button mode="text" onPress={() => setExpenseModalVisible(false)} color={theme.danger} style={{ flex: 1 }}>Cancelar</Button>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 15 },
    summaryCard: { margin: 15, borderRadius: 12, elevation: 4 },
    filterSection: { paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    filterDrawer: { overflow: 'hidden', paddingHorizontal: 15 },
    filterGrid: { flexDirection: 'row', gap: 10 },
    sectionLabel: { fontWeight: 'bold', fontSize: 12, marginBottom: 5 },
    pickerContainer: { flex: 1, minHeight: 55 },
    pickerWrapper: { borderWidth: 1, borderColor: '#555', borderRadius: 8, height: 50, justifyContent: 'center' },
    expenseCard: { marginBottom: 12, borderLeftWidth: 8, elevation: 2 },
    fab: { position: 'absolute', right: 20, bottom: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
    modalContent: { padding: 20, borderRadius: 15 },
    input: { borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 15 },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 }
});
