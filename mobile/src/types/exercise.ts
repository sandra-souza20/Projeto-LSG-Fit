export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  instructions: string | null;
  gifUrl: string | null;
  videoUrl: string | null;
  createdByProfessionalId?: string | null;
};
