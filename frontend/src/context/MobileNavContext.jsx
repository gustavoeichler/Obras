import { createContext, useContext } from 'react'

export const MobileNavContext = createContext({ isOpen: false, toggle: () => {}, close: () => {} })
export const useMobileNav = () => useContext(MobileNavContext)
