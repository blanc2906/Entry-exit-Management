// frontend/src/types/user.ts
export interface User {
  _id: string;
  userId: string;
  name: string;
  email?: string;
  fingerTemplate?: string;
  cardNumber?: string;
  createdAt: Date;
  updatedAt?: Date;
  devices: string[];
  history: string[];
}

export interface CreateUserDto {
  userId: string;
  name: string;
  createdAt: Date;
}

export interface AddFingerprintDto {
  userId: string;
  fingerId: number;
  fingerTemplate?: string;
  deviceMac: string;
}

export interface AddCardNumberDto {
  userId: string;
  cardNumber: string;
}