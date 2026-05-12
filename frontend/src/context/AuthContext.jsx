import { createContext, useContext, useState, useCallback } from 'react'

const AuthCtx = createContext(null)

const KEY_TOKEN = 'obras_token'
const KEY_USER  = 'obras_user'

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY_USER)) } catch { return null }
  })

  const setUser = useCallback((userData) => {
    if (userData) localStorage.setItem(KEY_USER, JSON.stringify(userData))
    else          localStorage.removeItem(KEY_USER)
    setUserState(userData)
  }, [])

  const login = useCallback((token, userData) => {
    localStorage.setItem(KEY_TOKEN, token)
    setUser(userData)
  }, [setUser])

  const logout = useCallback(() => {
    localStorage.removeItem(KEY_TOKEN)
    setUser(null)
  }, [setUser])

  return (
    <AuthCtx.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
