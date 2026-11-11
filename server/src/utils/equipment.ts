import type { Equipment } from "../../prisma/client/enums.js";
import { AppError } from "./app-error.js";

// Lista fixa de equipamentos (docs/contrato-api.md, seção "Exercícios").
// A ordem aqui é a ordem de exibição.
export const EQUIPMENT: { key: Equipment; label: string }[] = [
    { key: "BODYWEIGHT", label: "Peso corporal" },
    { key: "DUMBBELL", label: "Halteres" },
    { key: "BARBELL", label: "Barra" },
    { key: "BENCH", label: "Banco" },
    { key: "MAT", label: "Colchonete" },
    { key: "PULL_UP_BAR", label: "Barra fixa" },
    { key: "KETTLEBELL", label: "Kettlebell" },
    { key: "RESISTANCE_BAND", label: "Elástico" },
    { key: "CABLE", label: "Polia (cross-over)" },
    { key: "SMITH", label: "Smith" },
    { key: "LEG_PRESS", label: "Leg press" },
    { key: "LEG_EXTENSION", label: "Cadeira extensora" },
    { key: "LEG_CURL", label: "Mesa flexora" },
    { key: "PEC_DECK", label: "Peck deck" },
    { key: "PREACHER_BENCH", label: "Banco scott" },
    { key: "CALF_RAISE_MACHINE", label: "Máquina de panturrilha" },
];

// Já vêm marcados no cadastro da academia (mesmo default da coluna gyms.equipment).
export const DEFAULT_GYM_EQUIPMENT: Equipment[] = ["DUMBBELL", "BARBELL", "BENCH", "MAT", "PULL_UP_BAR"];

// Sempre disponível, em qualquer academia (não aparece para a academia marcar).
export const ALWAYS_AVAILABLE: Equipment = "BODYWEIGHT";

// Equipamentos com carga em kg. Exercicio sem nenhum deles (peso corporal,
// colchonete, barra fixa, elastico) nao registra carga.
const LOAD_EQUIPMENT = new Set<Equipment>([
    "DUMBBELL",
    "BARBELL",
    "KETTLEBELL",
    "CABLE",
    "SMITH",
    "LEG_PRESS",
    "LEG_EXTENSION",
    "LEG_CURL",
    "PEC_DECK",
    "CALF_RAISE_MACHINE",
]);

/** O exercicio usa carga (kg)? */
export function usesLoad(equipment: Equipment[]): boolean {
    return equipment.some((key) => LOAD_EQUIPMENT.has(key));
}

const LABELS = new Map(EQUIPMENT.map((item) => [item.key, item.label]));
const KEYS = new Set<string>(EQUIPMENT.map((item) => item.key));

/** `GET /equipment`. */
export function listEquipment() {
    return EQUIPMENT.map((item) => ({
        ...item,
        defaultForGyms: DEFAULT_GYM_EQUIPMENT.includes(item.key),
        alwaysAvailable: item.key === ALWAYS_AVAILABLE,
    }));
}

/** Valida uma lista de equipamentos do corpo. Remove repetidos e mantém a ordem da lista fixa. */
export function parseEquipmentList(input: unknown, options: { allowEmpty: boolean }): Equipment[] {
    if (!Array.isArray(input)) {
        throw new AppError("Informe os equipamentos em uma lista.");
    }

    const invalid = input.filter((value) => typeof value !== "string" || !KEYS.has(value));
    if (invalid.length > 0) {
        throw new AppError(`Equipamento inválido: ${invalid.map(String).join(", ")}.`);
    }

    const chosen = new Set(input as Equipment[]);
    const list = EQUIPMENT.map((item) => item.key).filter((key) => chosen.has(key));

    if (!options.allowEmpty && list.length === 0) {
        throw new AppError("Informe pelo menos um equipamento.");
    }

    return list;
}

/** "Barra + Banco". Sem equipamento: "Peso corporal". */
export function equipmentLabel(equipment: Equipment[]): string {
    if (equipment.length === 0) return LABELS.get(ALWAYS_AVAILABLE)!;
    return equipment.map((key) => LABELS.get(key) ?? key).join(" + ");
}

/** O exercício está disponível se a academia tem todos os equipamentos dele. */
export function isAvailableAt(exerciseEquipment: Equipment[], gymEquipment: Equipment[]): boolean {
    return exerciseEquipment.every((key) => key === ALWAYS_AVAILABLE || gymEquipment.includes(key));
}

type ExerciseRecord = {
    id: string;
    name: string;
    muscleGroup: string;
    equipment: Equipment[];
    instructions: string | null;
    gifUrl: string | null;
    videoUrl: string | null;
};

/**
 * Formato `Exercise` da API. `gymEquipment` é o da academia do aluno:
 * `availableAtGym` fica null quando não há academia para comparar.
 */
export function serializeExercise(exercise: ExerciseRecord, gymEquipment: Equipment[] | null) {
    return {
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        equipmentLabel: equipmentLabel(exercise.equipment),
        // false: peso corporal; o app nao mostra nem pede carga.
        usesLoad: usesLoad(exercise.equipment),
        instructions: exercise.instructions,
        gifUrl: exercise.gifUrl,
        videoUrl: exercise.videoUrl,
        availableAtGym: gymEquipment ? isAvailableAt(exercise.equipment, gymEquipment) : null,
    };
}
