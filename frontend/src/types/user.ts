export interface User {
  _id: string;
  name: string;
  email: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  fingerId?: number;
  cardNumber?: string;
  fingerTemplate?: string;
  workSchedule?: string;
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