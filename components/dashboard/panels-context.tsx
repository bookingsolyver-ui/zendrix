"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type PanelsContextValue = {
  notificationsOpen: boolean;
  tutorialsOpen: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  openTutorials: () => void;
  closeTutorials: () => void;
};

const PanelsContext = createContext<PanelsContextValue | null>(null);

export function PanelsProvider({ children }: { children: ReactNode }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tutorialsOpen, setTutorialsOpen] = useState(false);

  return (
    <PanelsContext.Provider
      value={{
        notificationsOpen,
        tutorialsOpen,
        openNotifications: () => setNotificationsOpen(true),
        closeNotifications: () => setNotificationsOpen(false),
        openTutorials: () => setTutorialsOpen(true),
        closeTutorials: () => setTutorialsOpen(false),
      }}
    >
      {children}
    </PanelsContext.Provider>
  );
}

export function usePanels() {
  const context = useContext(PanelsContext);
  if (!context) {
    throw new Error("usePanels must be used within a PanelsProvider");
  }
  return context;
}
