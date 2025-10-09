// frontend/screens/DividasScreen.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Menu, IconButton } from 'react-native-paper'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

export default function DividasScreen() {
  const { api } = useContext(AuthContext);
  const { theme, isDarkTheme } = useContext(ThemeContext);
  const [dividas, setDividas] = useState([]);
  const [sobraMensal, setSobraMensal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newDivida, setNewDivida] = useState({
    nome: '',
    valor_total: '',
    valor_a_pagar: '',
    data_limite: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDivida, setEditingDivida] = useState(null);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [visibleDividaMenu, setVisibleDividaMenu] = useState(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [dividasRes, usuarioRes, despesasRes] = await Promise.all([
        api.get('/dividas'), api.get('/usuario'), api.get('/despesas'),
      ]);

      setDividas(dividasRes.data);
      const renda = parseFloat(usuarioRes.data.renda_mensal) || 0;
      
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      const totalDespesasMes = despesasRes.data
        .filter(d => {
            const dataVencimento = new Date(d.data_vencimento);
            return !d.data_pagamento && dataVencimento.getMonth() === mesAtual && dataVencimento.getFullYear() === anoAtual;
        })
        .reduce((sum, d) => sum + parseFloat(d.valor), 0);

      setSobraMensal(renda - totalDespesasMes);
    } catch (error) {
      console.error('Erro ao buscar dados da tela de dívidas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));
  const onRefresh = () => fetchData();

  const handleAddDivida = async () => {
    if (!newDivida.nome || !newDivida.valor_total) {
      Alert.alert('Erro', 'Por favor, preencha o nome e o valor total da dívida.');
      return;
    }
    const valorTotal = parseFloat(newDivida.valor_total);
    const valorAPagar = parseFloat(newDivida.valor_a_pagar);
    if (!isNaN(valorAPagar) && valorAPagar > valorTotal) {
        Alert.alert('Erro', 'O valor a pagar não pode ser maior que o valor total da dívida.');
        return;
    }
    const valorDesconto = !isNaN(valorAPagar) ? valorTotal - valorAPagar : 0;
    try {
      await api.post('/dividas', {
        nome: newDivida.nome,
        valor_total: valorTotal,
        valor_desconto: valorDesconto,
        data_limite: newDivida.data_limite.toISOString().split('T')[0],
      });
      Alert.alert('Sucesso', 'Dívida adicionada com sucesso!');
      setAddModalVisible(false);
      setNewDivida({ nome: '', valor_total: '', valor_a_pagar: '', data_limite: new Date() });
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar dívida:', error);
      Alert.alert('Erro', 'Não foi possível adicionar a dívida.');
    }
  };

  const handleUpdateDivida = async () => {
    if (!editingDivida) return;
    const valorTotal = parseFloat(editingDivida.valor_total);
    const valorAPagar = parseFloat(editingDivida.valor_a_pagar);
    if (!isNaN(valorAPagar) && valorAPagar > valorTotal) {
        Alert.alert('Erro', 'O valor a pagar não pode ser maior que o valor total da dívida.');
        return;
    }
    const valorDesconto = !isNaN(valorAPagar) ? valorTotal - valorAPagar : 0;
    try {
      await api.put(`/dividas/${editingDivida.id}`, {
        nome: editingDivida.nome,
        valor_total: valorTotal,
        valor_desconto: valorDesconto,
        data_limite: editingDivida.data_limite.toISOString().split('T')[0],
      });
      Alert.alert("Sucesso", "Dívida atualizada!");
      setEditModalVisible(false);
      setEditingDivida(null);
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar dívida:", error);
      Alert.alert("Erro", "Não foi possível atualizar a dívida.");
    }
  };
  
  const handleOpenEditModal = (divida) => {
    const valorOriginal = parseFloat(divida.valor_total);
    const valorDesconto = parseFloat(divida.valor_desconto) || 0;
    const valorAPagar = valorOriginal - valorDesconto;
    const [year, month, day] = divida.data_limite.split('T')[0].split('-');
    setEditingDivida({
      ...divida,
      valor_total: String(valorOriginal),
      valor_a_pagar: String(valorAPagar),
      data_limite: new Date(year, parseInt(month) - 1, day),
    });
    setEditModalVisible(true);
    closeDividaMenu();
  };
  
  const handleDeleteDivida = (id) => {
    closeDividaMenu();
    Alert.alert("Confirmar Exclusão", "Você tem certeza que deseja excluir esta dívida?",
      [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: async () => {
        try {
          await api.delete(`/dividas/${id}`);
          Alert.alert("Sucesso", "Dívida excluída.");
          fetchData();
        } catch (error) {
          console.error("Erro ao excluir dívida:", error);
          Alert.alert("Erro", "Não foi possível excluir a dívida.");
        }
      }}]
    );
  };

  const handleToggleHomeVisibility = async (id) => {
    try {
      await api.put(`/dividas/${id}/toggle-home`);
      fetchData(); 
    } catch (error) {
      Alert.alert("Erro", "Não foi possível alterar a visibilidade.");
    }
    closeDividaMenu();
  };
  
  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if(selectedDate) setNewDivida({ ...newDivida, data_limite: selectedDate });
  };

  const onChangeEditDate = (event, selectedDate) => {
    setShowEditDatePicker(false);
    if (selectedDate && editingDivida) {
      setEditingDivida({ ...editingDivida, data_limite: selectedDate });
    }
  };

  const openDividaMenu = (id) => setVisibleDividaMenu(id);
  const closeDividaMenu = () => setVisibleDividaMenu(null);
  
  const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: theme.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: theme.text },
    card: { marginBottom: 15, elevation: 2, backgroundColor: theme.cardBackground },
    noDataText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: theme.subText },
    addButton: { backgroundColor: theme.primary, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 30, right: 30, elevation: 5 },
    addButtonText: { color: theme.text, fontSize: 30 },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: theme.cardBackground, padding: 20, borderRadius: 10, width: '90%', alignItems: 'center', elevation: 5 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: theme.text },
    input: { width: '100%', borderWidth: 1, borderColor: theme.subText, padding: 10, marginBottom: 10, borderRadius: 6, backgroundColor: isDarkTheme ? '#333' : '#fff', color: theme.text },
    datePickerButton: { width: '100%', padding: 10, borderWidth: 1, borderColor: theme.subText, borderRadius: 6, marginBottom: 10, justifyContent: 'center', alignItems: 'center' },
    detailsContainer: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.subText,
    },
    detailsTitle: {
      fontSize: 16,
      marginBottom: 5,
      color: theme.subText
    },
    detailText: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 5,
      lineHeight: 20,
    },
  });
  
  if (loading) { return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.text} /></View>; }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minhas Dívidas</Text>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}>
        {dividas.length > 0 ? (
          dividas.map(divida => {
            const valorOriginal = parseFloat(divida.valor_total);
            const valorDesconto = parseFloat(divida.valor_desconto) || 0;
            const valorFinal = valorOriginal - valorDesconto;
            let porcentagemDesconto = 0;
            if (valorOriginal > 0 && valorDesconto > 0) {
                porcentagemDesconto = (valorDesconto / valorOriginal) * 100;
            }
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const deadline = new Date(divida.data_limite); deadline.setMinutes(deadline.getMinutes() + deadline.getTimezoneOffset());
            const diffTime = deadline.getTime() - today.getTime();
            const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            const diffMonths = diffDays / 30.44;
            const dailySavings = diffDays > 0 ? valorFinal / diffDays : valorFinal;
            const monthlySavings = diffMonths > 0 ? valorFinal / diffMonths : valorFinal;
            let mesesParaPagar = null;
            if (sobraMensal > 0 && valorFinal > 0) {
              mesesParaPagar = valorFinal / sobraMensal;
            }

            return (
              <Card key={divida.id} style={styles.card}>
                <Card.Title
                  title={divida.nome}
                  titleStyle={{paddingTop: 10, fontWeight: 'bold', color: theme.text}}
                  left={(props) => <IconButton {...props} icon={divida.incluir_home ? "eye" : "eye-off"} iconColor={theme.text} />}
                  right={(props) => (
                    <Menu visible={visibleDividaMenu === divida.id} onDismiss={closeDividaMenu} anchor={<IconButton {...props} icon="dots-vertical" onPress={() => openDividaMenu(divida.id)} iconColor={theme.text}/>}>
                      <Menu.Item onPress={() => handleOpenEditModal(divida)} title="Editar" />
                      <Menu.Item onPress={() => handleToggleHomeVisibility(divida.id)} title={divida.incluir_home ? "Ocultar da Home" : "Mostrar na Home"} />
                      <Menu.Item onPress={() => handleDeleteDivida(divida.id)} title="Excluir" titleStyle={{color: theme.danger}}/>
                    </Menu>
                  )}
                />
                <Card.Content>
                  <Paragraph style={{color: theme.subText}}>Valor Original: <Text style={{color: theme.text}}>R$ {valorOriginal.toFixed(2)}</Text></Paragraph>
                  {valorDesconto > 0 && (<Paragraph style={{color: 'green'}}>Desconto: R$ {valorDesconto.toFixed(2)} ({porcentagemDesconto.toFixed(1)}%)</Paragraph>)}
                  <Title style={{color: theme.text}}>Valor a Pagar: <Text style={{color: isDarkTheme ? '#ff6347' : '#e53935'}}>R$ {valorFinal.toFixed(2)}</Text></Title>
                  <Paragraph style={{color: theme.subText}}>Prazo: {deadline.toLocaleDateString()}</Paragraph>
                  <View style={styles.detailsContainer}>
                    <Title style={styles.detailsTitle}>Plano (baseado no prazo)</Title>
                    {diffDays > 0 ? (<>
                      <Paragraph style={styles.detailText}>Tempo Restante: <Text style={{fontWeight: 'bold', color: theme.text}}>{diffDays} dias</Text></Paragraph>
                      <Paragraph style={styles.detailText}>Guardar <Text style={{fontWeight: 'bold', color: theme.secondary}}>R$ {dailySavings.toFixed(2)}/dia</Text> ou <Text style={{fontWeight: 'bold', color: theme.secondary}}>R$ {monthlySavings.toFixed(2)}/mês</Text>.</Paragraph>
                      </>
                      ) : (<Paragraph style={[styles.detailText, {color: 'red'}]}>O prazo expirou.</Paragraph>)
                    }
                  </View>
                  <View style={styles.detailsContainer}>
                    <Title style={styles.detailsTitle}>Projeção (baseado no que sobra)</Title>
                    {mesesParaPagar !== null && mesesParaPagar > 0 ? (<Paragraph style={styles.detailText}>Com sua sobra mensal de <Text style={{fontWeight: 'bold', color: theme.text}}>R$ {sobraMensal.toFixed(2)}</Text>, você quita em <Text style={{fontWeight: 'bold', color: 'green'}}>{mesesParaPagar.toFixed(1)} meses</Text>.</Paragraph>) : (<Paragraph style={[styles.detailText, {color: 'orange'}]}>Com base nas despesas deste mês, não está sobrando dinheiro para quitar esta dívida.</Paragraph>)
                    }
                  </View>
                </Card.Content>
              </Card>
            );
          })
        ) : ( <Text style={styles.noDataText}>Nenhuma dívida cadastrada.</Text> )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}><Text style={styles.addButtonText}>+</Text></TouchableOpacity>

      <Modal visible={addModalVisible} onRequestClose={() => setAddModalVisible(false)} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Nova Dívida</Text>
            <TextInput style={styles.input} placeholder="Nome da Dívida" placeholderTextColor={theme.subText} value={newDivida.nome} onChangeText={(text) => setNewDivida({ ...newDivida, nome: text })} />
            <TextInput style={styles.input} placeholder="Valor Total (sem desconto)" placeholderTextColor={theme.subText} keyboardType="numeric" value={newDivida.valor_total} onChangeText={(text) => setNewDivida({ ...newDivida, valor_total: text })}/>
            <TextInput style={styles.input} placeholder="Valor a Pagar (com desconto)" placeholderTextColor={theme.subText} keyboardType="numeric" value={newDivida.valor_a_pagar} onChangeText={(text) => setNewDivida({ ...newDivida, valor_a_pagar: text })}/>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}><Text style={{color: theme.text}}>Prazo para pagar: {newDivida.data_limite.toLocaleDateString()}</Text></TouchableOpacity>
            {showDatePicker && (<DateTimePicker value={newDivida.data_limite} mode="date" display="default" onChange={onChangeDate} />)}
            <Button mode="contained" onPress={handleAddDivida} style={{marginBottom: 10, width: '100%', backgroundColor: theme.primary}} labelStyle={{color: '#fff'}}>Adicionar Dívida</Button>
            <Button mode="outlined" onPress={() => setAddModalVisible(false)} style={{width: '100%'}}>Cancelar</Button>
          </View>
        </View>
      </Modal>

      {editingDivida && (
        <Modal visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Dívida</Text>
              <TextInput style={styles.input} placeholder="Nome da Dívida" placeholderTextColor={theme.subText} value={editingDivida.nome} onChangeText={(text) => setEditingDivida({ ...editingDivida, nome: text })} />
              <TextInput style={styles.input} placeholder="Valor Total" placeholderTextColor={theme.subText} keyboardType="numeric" value={editingDivida.valor_total} onChangeText={(text) => setEditingDivida({ ...editingDivida, valor_total: text })} />
              <TextInput style={styles.input} placeholder="Valor a Pagar (com desconto)" placeholderTextColor={theme.subText} keyboardType="numeric" value={editingDivida.valor_a_pagar} onChangeText={(text) => setEditingDivida({ ...editingDivida, valor_a_pagar: text })} />
              <TouchableOpacity onPress={() => setShowEditDatePicker(true)} style={styles.datePickerButton}><Text style={{color: theme.text}}>Prazo para pagar: {editingDivida.data_limite.toLocaleDateString()}</Text></TouchableOpacity>
              {showEditDatePicker && <DateTimePicker value={editingDivida.data_limite} mode="date" display="default" onChange={onChangeEditDate} />}
              <Button mode="contained" onPress={handleUpdateDivida} style={{marginBottom: 10, width: '100%', backgroundColor: theme.primary}} labelStyle={{color: '#fff'}}>Salvar Alterações</Button>
              <Button mode="outlined" onPress={() => setEditModalVisible(false)} style={{width: '100%'}}>Cancelar</Button>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}