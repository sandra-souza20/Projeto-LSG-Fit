export type ActorRole = 'STUDENT' | 'PROFESSIONAL';

export type User = {
  id: string;
  name: string;
  email: string;
  professionalId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Professional = {
  id: string;
  name: string;
  email: string;
  gymId?: string | null;
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

export type RegisterResponse = {
  user: User;
  message: string;
};

export type ProfessionalRegisterResponse = {
  professional: Professional;
};

export type MessageResponse = {
  message: string;
};
