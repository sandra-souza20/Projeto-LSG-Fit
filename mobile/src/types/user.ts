// Tipos da conta de aluno e de profissional (contrato da API, secao 4).
// A academia usa o app web e nao aparece mais no mobile.
export type UserRole = 'STUDENT' | 'PROFESSIONAL';

// Endereco da academia (contrato, secao 5). `formatted` e a linha pronta para exibir.
export type GymAddress = {
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  formatted: string;
};

// Academia resumida: em user.gym e na lista publica GET /gyms.
export type GymSummary = {
  id: string;
  name: string;
  phone: string | null;
  address: GymAddress | null;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  // Aluno: profissional que o orienta (relacao "Orienta"); null para profissional.
  professionalId: string | null;
  // Aluno: academia da matricula. Profissional: academia que o contratou.
  gymId: string | null;
  gym: GymSummary | null;
  // So aluno (null para profissional).
  gymEnrolledAt: string | null;
  // So profissional (null para aluno).
  specialty: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
};

// Resposta das rotas que criam sessao: login, confirmacao de e-mail,
// redefinicao de senha e ativacao da conta do profissional.
export type SessionResponse = {
  user: User;
  token: string;
  sessionId: string;
};

export type RegisterResponse = {
  user: User;
  message: string;
  // Presentes quando o servidor dispensa a confirmacao por e-mail.
  token?: string;
  sessionId?: string;
};

export type MessageResponse = {
  message: string;
};

// Item de GET /sessions (dispositivos conectados).
export type SessionListItem = {
  id: string;
  current: boolean;
  device: {
    browser: string | null;
    os: string | null;
    type: 'desktop' | 'mobile' | 'tablet' | null;
  };
  deviceName: string | null;
  ip: string;
  remember: boolean;
  createdAt: string;
  lastActiveAt: string;
};
