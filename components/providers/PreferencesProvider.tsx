"use client"

import { createContext, useContext, useEffect, useState } from "react"

interface PreferencesContextType {
  decimalPlaces: number
  setDecimalPlaces: (v: number) => void
}

const PreferencesContext = createContext<PreferencesContextType>({
  decimalPlaces: 2,
  setDecimalPlaces: () => {},
})

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [decimalPlaces, setDecimalPlacesState] = useState(2)

  useEffect(() => {
    const stored = localStorage.getItem("decimalPlaces")
    if (stored !== null) setDecimalPlacesState(parseInt(stored))
  }, [])

  const setDecimalPlaces = (v: number) => {
    setDecimalPlacesState(v)
    localStorage.setItem("decimalPlaces", String(v))
  }

  return (
    <PreferencesContext.Provider value={{ decimalPlaces, setDecimalPlaces }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  return useContext(PreferencesContext)
}
