export type PhysicalAssessment = {
  id: string;
  userId: string;
  recordedByProfessionalId: string | null;
  weight: number;
  height: number | null;
  chest: number | null;
  waist: number | null;
  hip: number | null;
  arm: number | null;
  thigh: number | null;
  notes: string | null;
  createdAt: string;
};

export type PhysicalAssessmentInput = {
  weight: number;
  height: number | null;
  chest: number | null;
  waist: number | null;
  hip: number | null;
  arm: number | null;
  thigh: number | null;
  notes: string | null;
};
