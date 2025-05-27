export interface User {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  cardNumber?: string;
  fingerprint?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  devices?: string[];
  fingerTemplate?: string;
}

export interface UsersResponse {
  items: User[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface UserFilters {
  search?: string;
  page: number;
  limit: number;
  status?: string;
}