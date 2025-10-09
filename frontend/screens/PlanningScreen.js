// frontend/screens/PlanningScreen.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Menu, IconButton } from 'react-native-paper'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

export default function PlanningScreen() {
  const { api } = useContext(AuthContext);
  const { theme, isDarkTheme } = useContext(ThemeContext);
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newMeta, setNewMeta] = useState({
    nome: '',
    valor_alvo: '',
    data_limite: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMeta, setEditingMeta] = useState(null);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [visibleMetaMenu, setVisibleMetaMenu] = useState(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/metas');
      setMetas(response.data);
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = () => {
    fetchData();
  };

  const handleAddMeta = async () => {
    if (!newMeta.nome || !newMeta.valor_alvo) {
      Alert.alert('Erro', 'Por favor, preencha o nome e o valor da meta.');
      return;
    }
    try {
      await api.post('/metas', {
        ...newMeta,
        valor_alvo: parseFloat(newMeta.valor_alvo),
        data_limite: newMeta.data_limite.toISOString().split('T')[0],
      });
      Alert.alert('Sucesso', 'Meta adicionada com sucesso!');
      setAddModalVisible(false);
      setNewMeta({ nome: '', valor_alvo: '', data_limite: new Date() });
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar meta:', error);
      Alert.alert('Erro', 'Não foi possível adicionar a meta.');
    }
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || newMeta.data_limite;
    setShowDatePicker(false);
    setNewMeta({ ...newMeta, data_limite: currentDate });
  };

  const openMetaMenu = (metaId) => setVisibleMetaMenu(metaId);
  const closeMetaMenu = () => setVisibleMetaMenu(null);

  const handleOpenEditModal = (meta) => {
    const [year, month, day] = meta.data_limite.split('T')[0].split('-');
    setEditingMeta({
      ...meta,
      valor_alvo: String(meta.valor_alvo),
      data_limite: new Date(year, parseInt(month) - 1, day),
    });
    setEditModalVisible(true);
    closeMetaMenu();
  };

  const handleUpdateMeta = async () => {
    if (!editingMeta) return;
    try {
      await api.put(`/metas/${editingMeta.id}`, {
        ...editingMeta,
        valor_alvo: parseFloat(editingMeta.valor_alvo),
        data_limite: editingMeta.data_limite.toISOString().split('T')[0],
      });
      Alert.alert("Sucesso", "Meta atualizada!");
      setEditModalVisible(false);
      setEditingMeta(null);
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar meta:", error);
      Alert.alert("Erro", "Não foi possível atualizar a meta.");
    }
  };

  const handleDeleteMeta = (id) => {
    closeMetaMenu();
    Alert.alert("Confirmar Exclusão", "Você tem certeza que deseja excluir esta meta?",
      [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: async () => {
        try {
          await api.delete(`/metas/${id}`);
          Alert.alert("Sucesso", "Meta excluída.");
          fetchData();
        } catch (error) {
          console.error("Erro ao excluir meta:", error);
          Alert.alert("Erro", "Não foi possível excluir a meta.");
        }
      }}]
    );
  };
  
  const onChangeEditDate = (event, selectedDate) => {
    setShowEditDatePicker(false);
    if (selectedDate && editingMeta) {
      setEditingMeta({ ...editingMeta, data_limite: selectedDate });
    }
  };

  const handleToggleHomeVisibility = async (id) => {
    try {
      await api.put(`/metas/${id}/toggle-home`);
      fetchData();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível alterar a visibilidade.");
    }
    closeMetaMenu();
  };

  const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: theme.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: theme.text },
    metaList: { flex: 1 },
    metaCard: { marginBottom: 15, elevation: 2, backgroundColor: theme.cardBackground },
    noMetasText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: theme.subText },
    addButton: { backgroundColor: theme.primary, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 30, right: 30, elevation: 5 },
    addButtonText: { color: '#fff', fontSize: 30 },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: theme.cardBackground, padding: 20, borderRadius: 10, width: '90%', alignItems: 'center', elevation: 5 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: theme.text },
    input: { width: '100%', borderWidth: 1, borderColor: theme.subText, padding: 10, marginBottom: 10, borderRadius: 6, backgroundColor: isDarkTheme ? '#333' : '#fff', color: theme.text },
    datePickerButton: { width: '100%', padding: 10, borderWidth: 1, borderColor: theme.subText, borderRadius: 6, marginBottom: 10, justifyContent: 'center', alignItems: 'center' },
    goalDetailsContainer: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.subText,
    },
    goalDetailText: {
      fontSize: 14,
      color: theme.subText,
      marginBottom: 5,
      lineHeight: 20,
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meus Planejamentos e Metas</Text>

      <ScrollView
        style={styles.metaList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
        }
      >
        {metas.length > 0 ? (
          metas.map(meta => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const deadline = new Date(meta.data_limite);
            deadline.setMinutes(deadline.getMinutes() + deadline.getTimezoneOffset());

            const diffTime = deadline.getTime() - today.getTime();
            const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            const diffMonths = diffDays / 30.44;
            const goalAmount = parseFloat(meta.valor_alvo);
            
            const dailySavings = diffDays > 0 ? goalAmount / diffDays : goalAmount;
            const monthlySavings = diffMonths > 0 ? goalAmount / diffMonths : goalAmount;

            return (
              <Card key={meta.id} style={styles.metaCard}>
                <Card.Title
                  title={meta.nome}
                  titleStyle={{paddingTop: 10, color: theme.text}}
                  left={(props) => <IconButton {...props} icon={meta.incluir_home ? "eye" : "eye-off"} iconColor={theme.text} />}
                  right={(props) => (
                    <Menu visible={visibleMetaMenu === meta.id} onDismiss={closeMetaMenu} anchor={<IconButton {...props} icon="dots-vertical" onPress={() => openMetaMenu(meta.id)} iconColor={theme.text} />}>
                      <Menu.Item onPress={() => handleOpenEditModal(meta)} title="Editar" />
                      <Menu.Item onPress={() => handleToggleHomeVisibility(meta.id)} title={meta.incluir_home ? "Ocultar da Home" : "Mostrar na Home"} />
                      <Menu.Item onPress={() => handleDeleteMeta(meta.id)} title="Excluir" titleStyle={{color: theme.danger}}/>
                    </Menu>
                  )}
                />
                <Card.Content>
                  <Paragraph style={{color: theme.subText}}>Valor Alvo: <Text style={{fontWeight: 'bold', color: theme.text}}>R$ {goalAmount.toFixed(2)}</Text></Paragraph>
                  <Paragraph style={{color: theme.subText}}>Data Limite: <Text style={{fontWeight: 'bold', color: theme.text}}>{deadline.toLocaleDateString()}</Text></Paragraph>
                  
                  <View style={styles.goalDetailsContainer}>
                    {diffDays > 0 ? (
                      <>
                        <Paragraph style={styles.goalDetailText}>
                          Tempo Restante: <Text style={{fontWeight: 'bold', color: theme.text}}>{diffDays} dias</Text> (~{diffMonths.toFixed(1)} meses)
                        </Paragraph>
                        <Paragraph style={styles.goalDetailText}>
                          Você precisa guardar <Text style={{fontWeight: 'bold', color: theme.secondary}}>R$ {dailySavings.toFixed(2)} por dia</Text>.
                        </Paragraph>
                        <Paragraph style={styles.goalDetailText}>
                          Ou <Text style={{fontWeight: 'bold', color: theme.secondary}}>R$ {monthlySavings.toFixed(2)} por mês</Text>.
                        </Paragraph>
                      </>
                    ) : (
                      <Paragraph style={[styles.goalDetailText, {color: theme.danger}]}>
                        O prazo para esta meta já expirou.
                      </Paragraph>
                    )}
                  </View>
                </Card.Content>
              </Card>
            );
          })
        ) : (
          <Text style={styles.noMetasText}>Nenhuma meta de planejamento encontrada.</Text>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Nova Meta</Text>
            <TextInput style={styles.input} placeholder="Nome da Meta" placeholderTextColor={theme.subText} value={newMeta.nome} onChangeText={(text) => setNewMeta({ ...newMeta, nome: text })} />
            <TextInput style={styles.input} placeholder="Valor Alvo" placeholderTextColor={theme.subText} keyboardType="numeric" value={newMeta.valor_alvo} onChangeText={(text) => setNewMeta({ ...newMeta, valor_alvo: text })}/>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
              <Text style={{color: theme.text}}>Data Limite: {newMeta.data_limite.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={newMeta.data_limite} mode="date" display="default" onChange={onChangeDate} />
            )}
            <Button mode="contained" onPress={handleAddMeta} style={{marginBottom: 10, width: '100%', backgroundColor: theme.primary}} labelStyle={{color: '#fff'}}>Adicionar Meta</Button>
            <Button mode="outlined" onPress={() => setAddModalVisible(false)} style={{width: '100%'}}>Cancelar</Button>
          </View>
        </View>
      </Modal>

      {editingMeta && (
        <Modal visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Meta</Text>
              <TextInput style={styles.input} placeholder="Nome da Meta" placeholderTextColor={theme.subText} value={editingMeta.nome} onChangeText={(text) => setEditingMeta({ ...editingMeta, nome: text })} />
              <TextInput style={styles.input} placeholder="Valor Alvo" placeholderTextColor={theme.subText} keyboardType="numeric" value={editingMeta.valor_alvo} onChangeText={(text) => setEditingMeta({ ...editingMeta, valor_alvo: text })} />
              <TouchableOpacity onPress={() => setShowEditDatePicker(true)} style={styles.datePickerButton}>
                <Text style={{color: theme.text}}>Data Limite: {editingMeta.data_limite.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {showEditDatePicker && <DateTimePicker value={editingMeta.data_limite} mode="date" display="default" onChange={onChangeEditDate} />}
              <Button mode="contained" onPress={handleUpdateMeta} style={{marginBottom: 10, width: '100%', backgroundColor: theme.primary}} labelStyle={{color: '#fff'}}>Salvar Alterações</Button>
              <Button mode="outlined" onPress={() => setEditModalVisible(false)} style={{width: '100%'}}>Cancelar</Button>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}