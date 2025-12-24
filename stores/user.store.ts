import { create } from "zustand";
import { User, PaginatedResponse } from "@/types";

interface UserState {
  users: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
  pagination: {
    count: number;
    page: number;
    pageSize: number;
  };
  setUsers: (users: User[]) => void;
  setSelectedUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (count: number, page: number, pageSize: number) => void;
  updateLocalUser: (userId: string, data: Partial<User>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  selectedUser: null,
  loading: false,
  error: null,
  pagination: {
    count: 0,
    page: 1,
    pageSize: 20,
  },
  setUsers: (users) => set({ users }),
  setSelectedUser: (user) => set({ selectedUser: user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setPagination: (count, page, pageSize) => set({ pagination: { count, page, pageSize } }),
  updateLocalUser: (userId, data) =>
    set((state) => ({
      users: state.users.map((user) => (user.id === userId ? { ...user, ...data } : user)),
      selectedUser:
        state.selectedUser?.id === userId ? { ...state.selectedUser, ...data } : state.selectedUser,
    })),
}));
