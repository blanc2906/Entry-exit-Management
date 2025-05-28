export interface User {
  _id: string;
  userId: string;
  name: string;
  email?: string;
  fingerId?: number;
  cardNumber?: string;
  createdAt: Date;
  updatedAt: Date;
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