// Equipamentos da lista fixa do servidor (GET /equipment).
export type EquipmentKey =
  | 'BODYWEIGHT'
  | 'DUMBBELL'
  | 'BARBELL'
  | 'BENCH'
  | 'MAT'
  | 'PULL_UP_BAR'
  | 'KETTLEBELL'
  | 'RESISTANCE_BAND'
  | 'CABLE'
  | 'SMITH'
  | 'LEG_PRESS'
  | 'LEG_EXTENSION'
  | 'LEG_CURL'
  | 'PEC_DECK'
  | 'PREACHER_BENCH'
  | 'CALF_RAISE_MACHINE';

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: EquipmentKey[];
  // Pronto para exibir, ex.: "Barra + Banco".
  equipmentLabel: string;
  // false: peso corporal (prancha, barra fixa...). Sem campo de carga.
  usesLoad: boolean;
  instructions: string | null;
  gifUrl: string | null;
  videoUrl: string | null;
  // Se existe na academia do aluno; null quando nao ha academia para comparar.
  availableAtGym: boolean | null;
};
