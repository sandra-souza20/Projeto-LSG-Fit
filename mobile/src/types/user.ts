export type ActorRole = 'STUDENT' | 'PROFESSIONAL' | 'GYM';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  professionalId?: string | null;
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
