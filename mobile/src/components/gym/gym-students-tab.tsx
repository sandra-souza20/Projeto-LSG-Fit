import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfirmModal } from '@/components/confirm-modal';
import { StudentFrequencyModal } from '@/components/gym/student-frequency-modal';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { apiRequest } from '@/services/api';
import { openWhatsApp } from '@/utils/contact';

// Relacao "Matricula" + caso de uso "Verificar Frequencia".
// RNF05: so contato, vinculo e datas de treino (sem ficha nem avaliacoes).
export type GymStudent = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  gymEnrolledAt: string | null;
  professional: { id: string; name: string } | null;
  lastWorkoutAt: string | null;
  // Treinos finalizados no mes atual.
  workoutsInRange: number;
};

// Sem treinar ha esse tanto de dias, o aluno aparece como ausente.
export const ABSENCE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type Filter = 'all' | 'absent';

function daysSince(date: string | null) {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS);
}

export function isAbsent(student: GymStudent) {
  const days = daysSince(student.lastWorkoutAt);
  return days === null || days >= ABSENCE_DAYS;
}

function lastWorkoutLabel(student: GymStudent) {
  const days = daysSince(student.lastWorkoutAt);
  if (days === null) return 'nunca finalizou um treino';
  if (days === 0) return 'último treino hoje';
  if (days === 1) return 'último treino ontem';
  return `último treino há ${days} dias`;
}

type GymStudentsTabProps = {
  students: GymStudent[];
  onStudentRemoved: (studentId: string) => void;
};

export function GymStudentsTab({ students, onStudentRemoved }: GymStudentsTabProps) {
  const theme = useTheme();
  const { token } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [frequencyStudent, setFrequencyStudent] = useState<GymStudent | null>(null);
  const [studentToRemove, setStudentToRemove] = useState<GymStudent | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const absentStudents = students.filter(isAbsent);
  const visibleStudents = filter === 'absent' ? absentStudents : students;
  const totalWorkouts = students.reduce((sum, student) => sum + student.workoutsInRange, 0);
  const studentsWhoTrained = students.filter((student) => student.workoutsInRange > 0).length;
  const average = students.length ? totalWorkouts / students.length : 0;
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  async function handleRemoveStudent() {
    if (!studentToRemove || !token) return;

    setIsRemoving(true);
    setRemoveError(null);
    try {
      await apiRequest<void>(`/gyms/me/students/${studentToRemove.id}`, { method: 'DELETE', token });
      onStudentRemoved(studentToRemove.id);
      setStudentToRemove(null);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Não foi possível desmatricular o aluno.');
    } finally {
      setIsRemoving(false);
    }
  }

  if (students.length === 0) {
    return (
      <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Nenhum aluno matriculado ainda. Os alunos escolhem a academia no cadastro ou em &quot;Perfil&quot;.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Frequência em {monthLabel}
        </ThemedText>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryValue} themeColor="accent">
              {totalWorkouts}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              treinos
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryValue} themeColor="accent">
              {studentsWhoTrained}/{students.length}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              alunos treinaram
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryValue} themeColor="accent">
              {average.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              média por aluno
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      <SegmentedControl
        options={[
          { value: 'all', label: `Todos (${students.length})` },
          { value: 'absent', label: `Ausentes (${absentStudents.length})` },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {filter === 'absent' && (
        <ThemedText type="small" themeColor="textSecondary">
          Alunos sem finalizar um treino há {ABSENCE_DAYS} dias ou mais. Vale chamar no WhatsApp antes que desistam.
        </ThemedText>
      )}

      {visibleStudents.length === 0 ? (
        <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Nenhum aluno ausente. Todos treinaram nos últimos {ABSENCE_DAYS} dias.
          </ThemedText>
        </ThemedView>
      ) : (
        visibleStudents.map((student) => {
          const absent = isAbsent(student);

          return (
            <ThemedView
              key={student.id}
              type="card"
              style={[styles.card, { borderColor: absent ? theme.danger : theme.border }]}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{student.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {student.professional ? `Personal: ${student.professional.name}` : 'Sem personal'}
                    {student.gymEnrolledAt
                      ? ` · desde ${new Date(student.gymEnrolledAt).toLocaleDateString('pt-BR')}`
                      : ''}
                  </ThemedText>
                  <ThemedText type="small" themeColor={absent ? 'danger' : 'textSecondary'}>
                    {student.workoutsInRange} {student.workoutsInRange === 1 ? 'treino' : 'treinos'} no mês ·{' '}
                    {lastWorkoutLabel(student)}
                  </ThemedText>
                </View>
                {student.phone && (
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      openWhatsApp(
                        student.phone!,
                        absent
                          ? `Olá, ${student.name.split(' ')[0]}! Sentimos sua falta na academia. Está tudo bem?`
                          : undefined,
                      )
                    }>
                    <ThemedText type="link" themeColor="accent">
                      WhatsApp
                    </ThemedText>
                  </Pressable>
                )}
              </View>
              <View style={styles.rowBetween}>
                <Pressable hitSlop={8} onPress={() => setFrequencyStudent(student)}>
                  <ThemedText type="small" themeColor="accent">
                    Ver frequência
                  </ThemedText>
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setRemoveError(null);
                    setStudentToRemove(student);
                  }}>
                  <ThemedText type="small" themeColor="danger">
                    Desmatricular
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          );
        })
      )}

      <StudentFrequencyModal student={frequencyStudent} onClose={() => setFrequencyStudent(null)} />

      <ConfirmModal
        visible={studentToRemove !== null}
        title="Desmatricular aluno"
        message={`${studentToRemove?.name ?? 'O aluno'} deixará de aparecer como aluno da academia. O vínculo com o personal continua.`}
        confirmLabel="Desmatricular"
        isSubmitting={isRemoving}
        error={removeError}
        onCancel={() => setStudentToRemove(null)}
        onConfirm={handleRemoveStudent}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
