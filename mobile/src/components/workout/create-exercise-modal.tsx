import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CreateExerciseInput = {
  name: string;
  muscleGroup: string;
  equipment: string;
  instructions: string | null;
  videoUrl: string | null;
  gifUrl: string | null;
};

type CreateExerciseModalProps = {
  visible: boolean;
  // Grupos ja existentes na biblioteca, oferecidos como atalho.
  muscleGroups: string[];
  isSubmitting: boolean;
  serverError?: string | null;
  onClose: () => void;
  onConfirm: (input: CreateExerciseInput) => void;
};

const EQUIPMENT_SUGGESTIONS = ['Barra', 'Halteres', 'Máquina', 'Polia', 'Peso corporal', 'Elástico'];

// RF08: cadastro previo de exercicios com nome, descricao e video demonstrativo.
export function CreateExerciseModal({
  visible,
  muscleGroups,
  isSubmitting,
  serverError,
  onClose,
  onConfirm,
}: CreateExerciseModalProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [instructions, setInstructions] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [gifUrl, setGifUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName('');
      setMuscleGroup('');
      setEquipment('');
      setInstructions('');
      setVideoUrl('');
      setGifUrl('');
      setError(null);
    }
  }, [visible]);

  function handleConfirm() {
    if (!name.trim() || !muscleGroup.trim() || !equipment.trim()) {
      setError('Preencha nome, grupo muscular e equipamento.');
      return;
    }

    const urls = [videoUrl.trim(), gifUrl.trim()].filter(Boolean);
    if (urls.some((url) => !/^https?:\/\/\S+$/i.test(url))) {
      setError('Os links precisam começar com http:// ou https://.');
      return;
    }

    setError(null);
    onConfirm({
      name: name.trim(),
      muscleGroup: muscleGroup.trim(),
      equipment: equipment.trim(),
      instructions: instructions.trim() || null,
      videoUrl: videoUrl.trim() || null,
      gifUrl: gifUrl.trim() || null,
    });
  }

  function renderChips(options: string[], value: string, onSelect: (value: string) => void) {
    return (
      <View style={styles.chips}>
        {options.map((option) => {
          const isSelected = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={[
                styles.chip,
                { backgroundColor: isSelected ? theme.accent : theme.inputBackground, borderColor: theme.border },
              ]}>
              <ThemedText type="small" themeColor={isSelected ? 'accentText' : 'textSecondary'}>
                {option}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView type="card" style={[styles.sheet, { borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={styles.title}>
            Novo exercício
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Ele fica disponível na biblioteca para todos os profissionais e alunos.
          </ThemedText>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <TextField
              label="Nome"
              placeholder="Ex: Remada cavalinho"
              autoCapitalize="sentences"
              value={name}
              onChangeText={setName}
            />

            <TextField
              label="Grupo muscular"
              placeholder="Ex: Costas"
              autoCapitalize="sentences"
              value={muscleGroup}
              onChangeText={setMuscleGroup}
            />
            {muscleGroups.length > 0 && renderChips(muscleGroups, muscleGroup, setMuscleGroup)}

            <TextField
              label="Equipamento"
              placeholder="Ex: Barra"
              autoCapitalize="sentences"
              value={equipment}
              onChangeText={setEquipment}
            />
            {renderChips(EQUIPMENT_SUGGESTIONS, equipment, setEquipment)}

            <TextField
              label="Descrição da execução"
              placeholder="Posição inicial, movimento, respiração e cuidados"
              autoCapitalize="sentences"
              multiline
              style={styles.multiline}
              value={instructions}
              onChangeText={setInstructions}
            />
            <TextField
              label="Link do vídeo (opcional)"
              placeholder="https://..."
              keyboardType="url"
              value={videoUrl}
              onChangeText={setVideoUrl}
            />
            <TextField
              label="Link do GIF (opcional)"
              placeholder="https://..."
              keyboardType="url"
              value={gifUrl}
              onChangeText={setGifUrl}
            />
          </ScrollView>

          {(error || serverError) && (
            <ThemedText type="small" themeColor="danger">
              {error ?? serverError}
            </ThemedText>
          )}

          <PrimaryButton label="Cadastrar exercício" isLoading={isSubmitting} onPress={handleConfirm} />

          <Pressable onPress={onClose} hitSlop={8} style={styles.cancelButton}>
            <ThemedText type="small" themeColor="textSecondary">
              Cancelar
            </ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  scroll: {
    flexGrow: 0,
  },
  form: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: -Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
});
