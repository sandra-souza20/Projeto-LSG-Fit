// Check-in do aluno matriculado (contrato da API, secao "Check-in").
export type CheckInStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'CANCELLED';

export type CheckIn = {
  id: string;
  status: CheckInStatus;
  requestedAt: string;
  // So para pendente: quando expira sem resposta (15 min).
  expiresAt: string | null;
  decidedAt: string | null;
  decidedBy: { id: string; name: string } | null;
  denialReason: string | null;
  // Ja usado num treino concluido.
  used: boolean;
};

export type CheckInToday = {
  // Sem academia nao ha check-in: o aluno treina direto.
  required: boolean;
  gym: { id: string; name: string } | null;
  inactive: { reason: string | null; since: string } | null;
  checkIn: CheckIn | null;
  trainedToday: boolean;
};
