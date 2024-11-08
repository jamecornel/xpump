import { createStore } from "zustand/vanilla";

export type UserState = {
  user: User | null;
  activeTab: string;
  checkUserExists: boolean;
  isInitialNavigation: boolean;
};

export type UserActions = {
  saveUser: (user: any) => void;
  deleteUser: () => void;
  setActiveTab: (tab: string) => void;
  setCheckUserExists: (checkUserExists: boolean) => void;
  setIsInitialNavigation: (isInitialNavigation: boolean) => void;
};

export type UserStore = UserState & UserActions;

export const defaultInitState: UserState = {
  user: null,
  activeTab: "home",
  checkUserExists: false,
  isInitialNavigation: false,
};

export const createUserStore = (initState: UserState = defaultInitState) => {
  return createStore<UserStore>()((set) => ({
    ...initState,
    saveUser: (user) => set(() => ({ user })),
    setActiveTab: (activeTab) => set(() => ({ activeTab })),
    deleteUser: () => set(() => ({ user: null })),
    setCheckUserExists: (checkUserExists) => set(() => ({ checkUserExists })),
    setIsInitialNavigation: (isInitialNavigation: boolean) =>
      set(() => ({ isInitialNavigation })),
  }));
};

export type User = {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  isPremium: boolean;
  referralCode: string;
  languageCode: string | null;
  photoUrl: string | null;
  referredByCode: string | null;
  walletAddress: string | null;
  walletSeed: string | null;
  walletType: "CREATED" | "IMPORTED" | null;
  createdAt: Date;
  updatedAt: Date;
};
