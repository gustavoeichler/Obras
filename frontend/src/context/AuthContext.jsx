import { createContext, useContext, useState, useCallback } from 'react'

const AuthCtx = createContext(null)

const KEY_TOKEN = 'obras_token'
const KEY_USER  = 'obras_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY_USER)) } catch { return null }
  })

  const login = useCallback((token, userData) => {
    localStorage.setItem(KEY_TOKEN, token)
    localStorage.setItem(KEY_USER, JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(KEY_TOKEN)
    localStorage.removeItem(KEY_USER)
    setUser(null)
  }, [])

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
