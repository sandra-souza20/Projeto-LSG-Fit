export type ActorRole = 'STUDENT' | 'PROFESSIONAL' | 'GYM';

export type GymLinkStatus = 'PENDING' | 'ACTIVE';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  professionalId?: string | null;
  // Relacao "Matricula" do DER: academia em que o aluno treina.
  gymId?: string | null;
  gymEnrolledAt?: string | null;
  gym?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type Professional = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  specialty?: string | null;
  bio?: string | null;
  gymId?: string | null;
  // Relacao "Contrata": PENDING ate a academia aprovar o vinculo.
  gymStatus?: GymLinkStatus | null;
  createdAt: string;
  updatedAt: string;
};

export type Gym = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};

export type ProfessionalAuthResponse = {
  professional: Professional;
  token: string;
};

export type GymAuthResponse = {
  gym: Gym;
  token: string;
};

export type RegisterResponse = {
  user: User;
  message: string;
  // Presente quando o servidor dispensa a confirmacao por e-mail.
  token?: string;
};

export type ProfessionalRegisterResponse = {
  professional: Professional;
};

export type GymRegisterResponse = {
  gym: Gym;
};

export type MessageResponse = {
  message: string;
};
