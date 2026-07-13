'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SidebarState = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggleCollapsed: () => set({ collapsed: !get().collapsed }),
    }),
    {
      name: 'food-delivery-web-sidebar',
    },
  ),
);
