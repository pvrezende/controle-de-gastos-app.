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
    Animated,
    Switch,
    FlatList 
} from 'react-native';
import { 
    Card, 
    Title, 
    Paragraph, 
    Button, 
    FAB, 
    Menu, 
    IconButton, 
    List, 
    Divider, 
    Surface,
    HelperText,
    Avatar,
    ProgressBar
} from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

// Configurações Globais de Tela
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * COMPONENTE: CustomDatePicker
 * Finalidade: Seletor de data robusto que evita sobreposições de layout no Android.
 */
const CustomDatePicker = ({ value, onChange, label, theme, isDarkTheme, showPicker, setShowPicker }) => {
    if (Platform.OS === 'web') {
        return (
            <View style={styles.datePickerContainerWeb}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>{label}:</Text>
                <input
                    type="date"
                    value={value instanceof Date ? value.toISOString().split('T')[0] : ""}
                    onChange={(e) => {
                        const selectedDate = new Date(e.target.value + 'T12:00:00');
                        onChange(null, selectedDate);
                    }}
                    style={{
                        padding: '16px',
                        borderRadius: '12px',
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
    }

    return (
        <View style={styles.datePickerContainerMobile}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>{label}:</Text>
            <TouchableOpacity 
                onPress={() => setShowPicker(true)} 
                style={[styles.inputField, { 
                    justifyContent: 'center', 
                    height: 60, 
                    borderColor: theme.subText, 
                    backgroundColor: isDarkTheme ? '#333' : '#fff' 
                }]}
            >
                <View style={styles.dateDisplayRow}>
                    <MaterialCommunityIcons name="calendar-month" size={24} color={theme.primary} />
                    <Text style={{ color: theme.text, marginLeft: 15, fontSize: 16 }}>
                        {value.toLocaleDateString('pt-BR')}
                    </Text>
                </View>
            </TouchableOpacity>
            {showPicker && (
                <DateTimePicker 
                    value={value} 
                    mode="date" 
                    display="default" 
                    onChange={(e, d) => { 
                        setShowPicker(false); 
                        if(d) onChange(e, d); 
                    }} 
                />
            )}
        </View>
    );
};

export default function ExpensesScreen({ route, navigation }) {
    const { api } = useContext(AuthContext);
    const { theme, isDarkTheme } = useContext(ThemeContext);
    
    // ==========================================
    // 1. ESTADOS DE DADOS FINANCEIROS (BACKEND)
    // ==========================================
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('all'); 
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    
    const filterAnim = useRef(new Animated.Value(0)).current;

    // ==========================================
    // 2. CONFIGURAÇÕES DE FILTRAGEM
    // ==========================================
    const [monthStart, setMonthStart] = useState(new Date().getMonth() + 1);
    const [yearStart, setYearStart] = useState(new Date().getFullYear());
    const [monthEnd, setMonthEnd] = useState(new Date().getMonth() + 1);
    const [yearEnd, setYearEnd] = useState(new Date().getFullYear());

    // ==========================================
    // 3. CONTROLE DE MODAIS
    // ==========================================
    const [expenseModalVisible, setExpenseModalVisible] = useState(false);
    const [replicateModalVisible, setReplicateModalVisible] = useState(false);
    const [groupListModalVisible, setGroupListModalVisible] = useState(false);
    const [syncModalVisible, setSyncModalVisible] = useState(false); 
    
    // ==========================================
    // 4. ESTADOS DE EDIÇÃO E SINCRONIZAÇÃO
    // ==========================================
    const [isEditing, setIsEditing] = useState(false);
    const [currentExpenseId, setCurrentExpenseId] = useState(null);
    const [targetGroupId, setTargetGroupId] = useState(null);
    const [selectedGroupData, setSelectedGroupData] = useState(null);
    
    const [replicateProgress, setReplicateProgress] = useState(0);
    const [syncLabel, setSyncLabel] = useState('Iniciando processamento...');
    
    const [newValueToReplicate, setNewValueToReplicate] = useState('');
    const [newNameToReplicate, setNewNameToReplicate] = useState('');
    const [newCategoryToReplicate, setNewCategoryToReplicate] = useState('outros');
    
    const [isParcelado, setIsParcelado] = useState(false);
    const [formData, setFormData] = useState({ 
        nome: '', valor: '', data_vencimento: new Date(), categoria: 'outros', numero_parcelas: '1' 
    });
    
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    const listMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const listYears = Array.from({length: 15}, (_, i) => new Date().getFullYear() - 5 + i);
    const tabLabels = { all: 'Geral (Filtro)', current: 'Mês Atual', overdue: 'Atrasadas', paid: 'Pagas', parcelados: 'Parcelados' };

    // ==========================================
    // 5. FUNÇÕES DE RENDERIZAÇÃO E ÍCONES
    // ==========================================
    
    const renderPicker = (val, setVal, items) => (
        <View style={styles.pickerItemBox}>
            <View style={[styles.pickerInnerFrame, { backgroundColor: isDarkTheme ? '#333' : '#fff' }]}>
                {Platform.OS === 'web' ? (
                    <select 
                        value={val} 
                        onChange={(e) => setVal(parseInt(e.target.value))}
                        style={{ background: 'transparent', color: theme.text, border: 'none', padding: '14px', width: '100%', outline: 'none' }}
                    >
                        {items.map((item, idx) => (
                            <option key={idx} value={typeof item === 'string' && items.length === 12 ? idx + 1 : item}>{item}</option>
                        ))}
                    </select>
                ) : (
                    <Picker
                        selectedValue={val}
                        onValueChange={(v) => setVal(v)}
                        style={{ color: theme.text, height: 50, width: '100%' }}
                        dropdownIconColor={theme.text}
                    >
                        {items.map((item, idx) => (
                            <Picker.Item 
                                key={idx} 
                                label={String(item)} 
                                value={typeof item === 'string' && items.length === 12 ? idx + 1 : item} 
                                color={isDarkTheme ? "#FFF" : "#000"} 
                            />
                        ))}
                    </Picker>
                )}
            </View>
        </View>
    );

    const getCategoryIcon = (categoryName) => {
        const catMap = {
            'moradia': 'home-city',
            'transporte': 'car-side',
            'gamer': 'controller-classic',
            'pets': 'paw',
            'lazer': 'palm-tree',
            'saúde': 'medical-bag',
            'alimentação': 'food-apple',
            'educação': 'school'
        };
        const name = (categoryName || 'outros').toLowerCase();
        return catMap[name] || 'receipt';
    };

    const toggleFilters = () => {
        const toValue = isFilterVisible ? 0 : 1;
        Animated.spring(filterAnim, { toValue, friction: 8, tension: 35, useNativeDriver: false }).start();
        setIsFilterVisible(!isFilterVisible);
    };

    const drawerHeight = filterAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Platform.OS === 'web' ? 280 : 480] 
    });

    // ==========================================
    // 6. OPERAÇÕES DE API
    // ==========================================
    const fetchData = async () => {
        try {
            setRefreshing(true);
            const [despRes, catRes] = await Promise.all([api.get('/despesas'), api.get('/categorias')]);
            setDespesas(despRes.data || []);
            setCategorias(catRes.data || []);
        } catch (error) { 
            console.error("Erro RDS:", error);
        } finally { 
            setLoading(false); 
            setRefreshing(false); 
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    const togglePayment = async (item) => {
        try {
            const dtStatus = item.data_pagamento ? null : new Date().toISOString().split('T')[0];
            await api.put(`/despesas/${item.id}/pagar`, { data_pagamento: dtStatus });
            fetchData();
        } catch (e) {
            Alert.alert("Erro", "Falha ao liquidar despesa.");
        }
    };

    const handleDelete = (id) => {
        const confirmDel = async () => { 
            try { 
                await api.delete(`/despesas/${id}`); 
                fetchData(); 
            } catch (e) { Alert.alert("Erro", "Erro ao apagar registro."); }
        };
        if (Platform.OS === 'web') { 
            if(confirm("Confirmar exclusão?")) confirmDel(); 
        } else { 
            Alert.alert("Excluir", "Remover esta despesa permanentemente?", [
                {text: "Voltar"}, 
                {text: "Apagar", onPress: confirmDel, style: 'destructive'}
            ]); 
        }
    };

    const handleDeleteGroup = (groupId) => {
        const delGroup = async () => { 
            try { 
                await api.delete(`/parcelamentos/${groupId}`); 
                setGroupListModalVisible(false);
                fetchData(); 
            } catch (e) { Alert.alert("Erro", "Falha ao apagar grupo."); }
        };
        Alert.alert("Apagar Parcelamento", "Isso excluirá permanentemente TODAS as parcelas deste grupo. Confirmar?", [
            {text: "Cancelar"}, 
            {text: "Sim, Apagar Tudo", onPress: delGroup, style: 'destructive'}
        ]);
    };

    const openEdit = (item) => {
        setIsEditing(true);
        setIsParcelado(item.compra_parcelada_id !== null);
        setCurrentExpenseId(item.id);
        setFormData({
            nome: item.nome,
            valor: String(item.valor),
            data_vencimento: new Date(item.data_vencimento),
            categoria: item.categoria || 'outros',
            numero_parcelas: '1'
        });
        setExpenseModalVisible(true);
    };

    // ==========================================
    // 7. LÓGICA DE REPLICAÇÃO SEGURA (ESPECIAL 5G)
    // ==========================================
    const handleSaveReplicate = async () => {
        const vNum = parseFloat(newValueToReplicate.trim().replace(',', '.'));
        if (isNaN(vNum) || vNum <= 0 || !newNameToReplicate.trim()) {
            Alert.alert("Formulário", "Informe nome e valor válidos.");
            return;
        }

        try {
            setReplicateModalVisible(false);
            setSyncModalVisible(true);
            setReplicateProgress(0);
            
            const pAlvo = [...despesas]
                .filter(d => d.compra_parcelada_id === targetGroupId)
                .sort((a,b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
                
            const totalCount = pAlvo.length;

            for (let i = 0; i < totalCount; i++) {
                const itemAtu = pAlvo[i];
                const seq = i + 1;
                setSyncLabel(`Sincronizando ${seq} de ${totalCount}...`);
                
                await api.put(`/despesas/${itemAtu.id}`, {
                    nome: `${newNameToReplicate.trim()} (${seq}/${totalCount})`,
                    valor: vNum,
                    data_vencimento: itemAtu.data_vencimento.split('T')[0],
                    categoria: newCategoryToReplicate,
                    fixo: itemAtu.fixo || 0
                });
                
                await new Promise(r => setTimeout(r, 250));
                setReplicateProgress(seq / totalCount);
            }
            
            setSyncModalVisible(false);
            setGroupListModalVisible(false);
            fetchData();
        } catch (err) {
            setSyncModalVisible(false);
            Alert.alert("Erro de Sincronia", "A conexão com o servidor falhou.");
        }
    };

    const handleSaveExpense = async () => {
        if (!formData.nome.trim() || !formData.valor) return;
        try {
            const vConv = parseFloat(String(formData.valor).replace(',', '.'));
            if (isParcelado && !isEditing) {
                await api.post('/parcelamentos', { ...formData, valor_total: vConv, numero_parcelas: parseInt(formData.numero_parcelas), data_compra: new Date().toISOString().split('T')[0], data_primeira_parcela: formData.data_vencimento.toISOString().split('T')[0] });
            } else {
                const pld = { ...formData, valor: vConv, data_vencimento: formData.data_vencimento.toISOString().split('T')[0], fixo: 0 };
                if (isEditing) await api.put(`/despesas/${currentExpenseId}`, pld);
                else await api.post('/despesas', pld);
            }
            setExpenseModalVisible(false);
            fetchData();
        } catch (e) { Alert.alert("Erro", "Falha ao gravar."); }
    };

    // ==========================================
    // 8. RENDERIZAÇÃO DE INTERFACE
    // ==========================================
    const renderParceladosTab = () => {
        const agrp = {};
        despesas.filter(d => d.compra_parcelada_id !== null).forEach(it => {
            if (!agrp[it.compra_parcelada_id]) agrp[it.compra_parcelada_id] = { id: it.compra_parcelada_id, nome: it.nome.split(' (')[0], total: 0, items: [] };
            agrp[it.compra_parcelada_id].items.push(it);
            agrp[it.compra_parcelada_id].total += parseFloat(it.valor);
        });

        if (Object.keys(agrp).length === 0) return <View style={styles.viewEmptyState}><MaterialCommunityIcons name="archive-off" size={100} color={theme.subText} /><Text style={{ color: theme.subText, fontSize: 18 }}>Sem parcelamentos.</Text></View>;

        return Object.values(agrp).map(gp => {
            // CORREÇÃO DEFINITIVA: Cópia segura para evitar crash de 'sort' no Android
            const itemsValidos = gp.items || [];
            const sortedItems = itemsValidos.length > 0 ? [...itemsValidos].sort((a,b) => new Date(a.data_vencimento) - new Date(b.data_vencimento)) : [];
            const quitDate = sortedItems.length > 0 ? new Date(sortedItems[sortedItems.length-1].data_vencimento).toLocaleDateString('pt-BR') : '-';
            
            return (
                <Card 
                    key={gp.id} 
                    style={[styles.cardGroupOuter, { backgroundColor: theme.cardBackground }]} 
                    onPress={() => { 
                        setTargetGroupId(gp.id); 
                        setSelectedGroupData({ ...gp, items: sortedItems }); 
                        setGroupListModalVisible(true); 
                    }}
                >
                    <Card.Content style={styles.cardGroupInner}>
                        <Surface style={[styles.boxIconSurface, { backgroundColor: theme.primary + '18' }]} elevation={2}><MaterialCommunityIcons name="layers-triple" size={28} color={theme.primary} /></Surface>
                        <View style={{ flex: 1, marginLeft: 20 }}><Text style={[styles.textGroupTitle, { color: theme.text }]}>{gp.nome}</Text><Paragraph style={{ color: theme.primary, fontWeight: 'bold' }}>Total: R$ {gp.total.toFixed(2)} | <Text style={{ color: '#2196F3' }}>Quitação: {quitDate}</Text></Paragraph></View>
                        <MaterialCommunityIcons name="chevron-right-circle" size={24} color={theme.subText} />
                    </Card.Content>
                </Card>
            );
        });
    };

    const renderParcelaItem = ({ item }) => (
        <List.Item
            title={item.nome}
            description={`Vencimento: ${new Date(item.data_vencimento).toLocaleDateString('pt-BR')} • ${item.categoria || 'outros'}`}
            titleStyle={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}
            left={props => <Avatar.Icon {...props} size={44} icon={getCategoryIcon(item.categoria)} style={{ backgroundColor: theme.primary + '15' }} color={theme.primary} />}
            right={() => <View style={styles.rowItemAction}><Text style={{ color: theme.text, fontWeight: '900' }}>R$ {parseFloat(item.valor).toFixed(2)}</Text><IconButton icon="pencil" size={20} iconColor={theme.primary} onPress={() => { setGroupListModalVisible(false); openEdit(item); }} /><IconButton icon={item.data_pagamento ? "check-circle" : "circle-outline"} iconColor={item.data_pagamento ? '#4CAF50' : theme.subText} onPress={() => togglePayment(item)} /></View>}
            style={styles.borderListItem}
        />
    );

    const getFilteredData = () => {
        const dH = new Date(); dH.setHours(0,0,0,0);
        return despesas.filter(d => {
            const arr = d.data_vencimento.split('T')[0].split('-');
            const dV = new Date(parseInt(arr[0]), parseInt(arr[1])-1, parseInt(arr[2]), 12, 0, 0);
            if (selectedTab === 'all') return dV >= new Date(yearStart, monthStart-1, 1) && dV <= new Date(yearEnd, monthEnd, 0, 23, 59, 59);
            if (selectedTab === 'current') return dV.getMonth() === dH.getMonth() && dV.getFullYear() === dH.getFullYear();
            if (selectedTab === 'overdue') return dV < dH && d.data_pagamento === null;
            if (selectedTab === 'paid') return d.data_pagamento !== null;
            return true;
        });
    };

    return (
        <View style={[styles.mainWrapper, { backgroundColor: theme.background }]}>
            <Surface style={[styles.headerArea, { backgroundColor: theme.background }]} elevation={2}>
                <Text style={[styles.txtHeaderTitle, { color: theme.text }]}>Minhas Despesas</Text>
            </Surface>
            
            <Card style={[styles.cardSummaryBox, { backgroundColor: isDarkTheme ? '#1c1c1c' : '#f0faff' }]}>
                <Card.Content>
                    <Title style={{ fontSize: 38, color: theme.primary, fontWeight: 'bold' }}>R$ {(selectedTab === 'parcelados' ? despesas.filter(d => d.compra_parcelada_id !== null) : getFilteredData()).reduce((s, d) => s + parseFloat(d.valor), 0).toFixed(2)}</Title>
                    <Divider style={styles.dividerSummary} />
                    <View style={styles.rowStatusPaid}><MaterialCommunityIcons name="check-decagram" size={24} color="#4CAF50" /><Text style={{ color: '#4CAF50', fontWeight: 'bold', marginLeft: 10, fontSize: 17 }}>Pagas: R$ {(selectedTab === 'parcelados' ? despesas.filter(d => d.compra_parcelada_id !== null && d.data_pagamento) : getFilteredData().filter(d => d.data_pagamento)).reduce((s, d) => s + parseFloat(d.valor), 0).toFixed(2)}</Text></View>
                </Card.Content>
            </Card>

            <View style={styles.filterControlBar}>
                <Menu visible={menuVisible} onDismiss={() => setMenuVisible(false)} anchor={<Button mode="contained-tonal" onPress={() => setMenuVisible(true)} icon="filter-variant" style={styles.btnMenuAnchor}>{tabLabels[selectedTab]}</Button>}>
                    {Object.keys(tabLabels).map(k => <Menu.Item key={k} onPress={() => { setSelectedTab(k); setMenuVisible(false); }} title={tabLabels[k]} />)}
                </Menu>
                {selectedTab === 'all' && <IconButton icon={isFilterVisible ? "chevron-up-circle" : "calendar-range"} size={36} iconColor={theme.primary} onPress={toggleFilters} />}
            </View>

            {/* GAVETA DE FILTROS REESTRUTURADA PARA EVITAR SOBREPOSIÇÃO */}
            {selectedTab === 'all' && (
                <Animated.View style={[styles.viewDrawerFilter, { height: drawerHeight }]}>
                    <View style={styles.gridFilterInputs}>
                        <View style={styles.colFilter}>
                            <Text style={[styles.txtLabelFilter, { color: theme.primary }]}>DATA INICIAL:</Text>
                            <View style={styles.rowPickerFilter}>
                                {renderPicker(monthStart, setMonthStart, listMonths)}
                                {renderPicker(yearStart, setYearStart, listYears)}
                            </View>
                        </View>
                        <Divider style={{ marginVertical: 10 }} />
                        <View style={styles.colFilter}>
                            <Text style={[styles.txtLabelFilter, { color: theme.primary }]}>DATA FINAL:</Text>
                            <View style={styles.rowPickerFilter}>
                                {renderPicker(monthEnd, setMonthEnd, listMonths)}
                                {renderPicker(yearEnd, setYearEnd, listYears)}
                            </View>
                        </View>
                        <Button mode="contained" onPress={toggleFilters} style={styles.btnSubmitFilter}>FILTRAR AGORA</Button>
                    </View>
                </Animated.View>
            )}

            <ScrollView contentContainerStyle={styles.containerScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} colors={[theme.primary]} />}>
                {selectedTab === 'parcelados' ? renderParceladosTab() : getFilteredData().map(item => (
                    <Card key={item.id} style={[styles.cardItemExpense, { backgroundColor: theme.cardBackground, borderLeftColor: item.data_pagamento ? '#4CAF50' : theme.danger }]}>
                        <Card.Title title={item.nome} subtitle={`${item.data_vencimento.split('T')[0].split('-').reverse().join('/')} • ${item.categoria}`} left={() => <Avatar.Icon size={46} icon={getCategoryIcon(item.categoria)} color="white" style={{ backgroundColor: theme.primary }} />} right={() => <View style={styles.rowCardActions}><IconButton icon="pencil" iconColor={theme.primary} onPress={() => openEdit(item)} /><IconButton icon="delete" iconColor={theme.danger} onPress={() => handleDelete(item.id)} /></View>} titleStyle={{ color: theme.text, fontWeight: 'bold' }} />
                        <Card.Content style={styles.contentItemValue}><Text style={[styles.txtValueItem, { color: theme.text }]}>R$ {parseFloat(item.valor).toFixed(2)}</Text><Button mode={item.data_pagamento ? "outlined" : "contained"} style={[styles.btnPayAction, { borderColor: item.data_pagamento ? '#4CAF50' : 'transparent' }]} onPress={() => togglePayment(item)}>{item.data_pagamento ? "PAGA ✅" : "PAGAR"}</Button></Card.Content>
                    </Card>
                ))}
            </ScrollView>

            <FAB style={[styles.btnFabPlus, { backgroundColor: theme.primary }]} icon="plus-box" color="white" label="ADICIONAR" onPress={() => { setIsEditing(false); setIsParcelado(false); setFormData({ nome: '', valor: '', data_vencimento: new Date(), categoria: 'outros', numero_parcelas: '1' }); setExpenseModalVisible(true); }} />

            <Modal visible={groupListModalVisible} animationType="slide">
                <View style={[styles.mainWrapper, { backgroundColor: theme.background, padding: 25 }]}>
                    <View style={styles.rowModalHeader}><Title style={{ color: theme.text, flex: 1, fontSize: 24, fontWeight: 'bold' }}>{selectedGroupData?.nome}</Title><IconButton icon="close-circle" iconColor={theme.danger} size={36} onPress={() => setGroupListModalVisible(false)} /></View>
                    <View style={styles.rowGroupActions}>
                        <Button icon="sync" mode="contained" onPress={() => { setNewNameToReplicate(selectedGroupData?.nome); setNewValueToReplicate(String(selectedGroupData?.items?.[0]?.valor || '')); setNewCategoryToReplicate(selectedGroupData?.items?.[0]?.categoria || 'outros'); setReplicateModalVisible(true); }} style={styles.flexBtnAction}>REPLICAR</Button>
                        <Button icon="delete-sweep" mode="outlined" textColor={theme.danger} onPress={() => handleDeleteGroup(targetGroupId)} style={[styles.flexBtnAction, { borderColor: theme.danger }]}>EXCLUIR</Button>
                    </View>
                    <FlatList data={selectedGroupData?.items || []} keyExtractor={(it) => it.id.toString()} renderItem={renderParcelaItem} initialNumToRender={20} />
                </View>
            </Modal>

            {/* MODAL DE CADASTRO COM CATEGORIA */}
            <Modal visible={expenseModalVisible} animationType="fade" transparent={true}>
                <View style={styles.viewOverlayModal}>
                    <View style={[styles.viewContentModal, { backgroundColor: theme.cardBackground }]}>
                        <Title style={[styles.txtModalTitle, { color: theme.text }]}>{isEditing ? 'Editar Despesa' : 'Nova Despesa'}</Title>
                        {!isEditing && <View style={styles.rowSwitchWrap}><Text style={{ color: theme.text, fontWeight: 'bold' }}>Compra parcelada?</Text><Switch value={isParcelado} onValueChange={setIsParcelado} /></View>}
                        <TextInput style={[styles.inputFieldTxt, { color: theme.text, borderColor: theme.subText }]} placeholder="Nome" value={formData.nome} onChangeText={t => setFormData({...formData, nome: t})} />
                        <TextInput style={[styles.inputFieldTxt, { color: theme.text, borderColor: theme.subText }]} placeholder="Valor" keyboardType="numeric" value={formData.valor} onChangeText={t => setFormData({...formData, valor: t})} />
                        {isParcelado && !isEditing && <TextInput style={[styles.inputFieldTxt, { color: theme.text, borderColor: theme.subText }]} placeholder="Parcelas" keyboardType="numeric" value={formData.numero_parcelas} onChangeText={t => setFormData({...formData, numero_parcelas: t})} />}
                        <CustomDatePicker label="Vencimento" value={formData.data_vencimento} onChange={(e, d) => setFormData({...formData, data_vencimento: d})} theme={theme} isDarkTheme={isDarkTheme} showPicker={showDatePicker} setShowPicker={setShowDatePicker} />
                        <Text style={[styles.txtMiniLabel, { color: theme.text }]}>Categoria:</Text>
                        <View style={[styles.boxPickerWrap, { backgroundColor: isDarkTheme ? '#2a2a2a' : '#f5f5f5' }]}><Picker selectedValue={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})} style={{ color: theme.text }}>{categorias.map(c => <Picker.Item key={c.id} label={c.nome} value={c.nome} />)}</Picker></View>
                        <View style={styles.boxModalBtnRow}><Button mode="contained" onPress={handleSaveExpense} style={styles.flexBtnAction}>SALVAR</Button><Button mode="text" onPress={() => setExpenseModalVisible(false)} textColor={theme.danger} style={styles.flexBtnAction}>CANCELAR</Button></View>
                    </View>
                </View>
            </Modal>

            <Modal visible={replicateModalVisible} animationType="fade" transparent={true}>
                <View style={styles.viewOverlayModal}>
                    <View style={[styles.viewContentModal, { backgroundColor: theme.cardBackground }]}>
                        <Title style={[styles.txtModalTitle, { color: theme.text, marginBottom: 25 }]}>Mudar Valor Lote</Title>
                        <TextInput style={[styles.inputFieldTxt, { color: theme.text, borderColor: theme.subText }]} value={newNameToReplicate} onChangeText={setNewNameToReplicate} />
                        <TextInput style={[styles.inputFieldTxt, { color: theme.text, borderColor: theme.subText }]} keyboardType="numeric" value={newValueToReplicate} onChangeText={setNewValueToReplicate} />
                        <View style={[styles.boxPickerWrap, { backgroundColor: isDarkTheme ? '#2a2a2a' : '#f5f5f5', marginBottom: 25 }]}><Picker selectedValue={newCategoryToReplicate} onValueChange={setNewCategoryToReplicate} style={{ color: theme.text }}>{categorias.map(c => <Picker.Item key={c.id} label={c.nome} value={c.nome} />)}</Picker></View>
                        <View style={styles.boxModalBtnRow}><Button mode="contained" onPress={handleSaveReplicate} style={styles.flexBtnAction}>SINCRONIZAR</Button><Button mode="text" onPress={() => setReplicateModalVisible(false)} textColor={theme.danger} style={styles.flexBtnAction}>FECHAR</Button></View>
                    </View>
                </View>
            </Modal>

            <Modal visible={syncModalVisible} transparent={true}>
                <View style={styles.viewOverlayModal}>
                    <View style={[styles.viewContentModal, { backgroundColor: theme.cardBackground, alignItems: 'center', padding: 50 }]}>
                        <ActivityIndicator size={80} color={theme.primary} />
                        <Text style={{ color: theme.text, marginTop: 35, fontWeight: '900', fontSize: 24 }}>{Math.round(replicateProgress * 100)}%</Text>
                        <ProgressBar progress={replicateProgress} color={theme.primary} style={styles.progressSinc} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    mainWrapper: { flex: 1 },
    headerArea: { paddingVertical: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
    txtHeaderTitle: { fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
    cardSummaryBox: { margin: 20, borderRadius: 25, elevation: 12 },
    dividerSummary: { marginVertical: 12, height: 2 },
    rowStatusPaid: { flexDirection: 'row', alignItems: 'center' },
    filterControlBar: { paddingHorizontal: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    btnMenuAnchor: { borderRadius: 14 },
    viewDrawerFilter: { overflow: 'hidden', paddingHorizontal: 22, marginBottom: 30, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 20 },
    gridFilterInputs: { padding: 15 },
    colFilter: { marginBottom: 12 },
    txtLabelFilter: { fontWeight: '900', fontSize: 13, marginBottom: 6 },
    rowPickerFilter: { flexDirection: 'row', gap: 10 },
    pickerItemBox: { flex: 1, minHeight: 65 },
    pickerInnerFrame: { borderWidth: 1.5, borderColor: '#777', borderRadius: 15, height: 60, justifyContent: 'center' },
    containerScroll: { padding: 20, paddingBottom: 220 },
    cardItemExpense: { marginBottom: 20, borderLeftWidth: 14, elevation: 6, borderRadius: 22 },
    rowCardActions: { flexDirection: 'row' },
    contentItemValue: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    txtValueItem: { fontSize: 26, fontWeight: '900' },
    btnPayAction: { borderRadius: 14, minWidth: 130 },
    btnFabPlus: { position: 'absolute', right: 35, bottom: 45, elevation: 15, padding: 8 },
    viewOverlayModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center', padding: 25 },
    viewContentModal: { padding: 35, borderRadius: 35, elevation: 25 },
    inputFieldTxt: { borderWidth: 1, padding: 18, borderRadius: 16, marginBottom: 18, fontSize: 17 },
    boxModalBtnRow: { flexDirection: 'row', gap: 15, marginTop: 30 },
    flexBtnAction: { flex: 1 },
    txtModalTitle: { textAlign: 'center', fontSize: 26, fontWeight: 'bold' },
    rowSwitchWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, paddingHorizontal: 10 },
    rowModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 35 },
    rowGroupActions: { flexDirection: 'row', gap: 15, marginBottom: 30 },
    cardGroupOuter: { marginBottom: 20, borderRadius: 26, elevation: 8 },
    cardGroupInner: { flexDirection: 'row', alignItems: 'center', padding: 25 },
    boxIconSurface: { padding: 16, borderRadius: 20 },
    textGroupTitle: { fontSize: 21, fontWeight: 'bold' },
    rowItemAction: { flexDirection: 'row', alignItems: 'center' },
    borderListItem: { borderBottomWidth: 1.5, paddingVertical: 18 },
    viewEmptyState: { padding: 130, alignItems: 'center', justifyContent: 'center' },
    btnSubmitFilter: { marginTop: 30, borderRadius: 18, height: 60 },
    datePickerContainerWeb: { marginBottom: 25 },
    datePickerContainerMobile: { marginBottom: 25 },
    dateDisplayRow: { flexDirection: 'row', alignItems: 'center' },
    txtMiniLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginLeft: 6 },
    boxPickerWrap: { borderWidth: 1, borderColor: '#888', borderRadius: 18, height: 64, justifyContent: 'center', overflow: 'hidden' },
    progressSinc: { height: 14, borderRadius: 7, width: '100%', marginTop: 35 },
    centerAll: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
