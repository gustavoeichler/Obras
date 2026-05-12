import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { meApi } from '../api/client'

const BrandingCtx = createContext(null)

const DEFAULT_BRANDING = {
  name:          'OBRAS',
  primary_color: '#d4a017',
  default_theme: 'dark',
  logo_url:      null,
}

function resolveTheme(themePreference, defaultTheme) {
  if (themePreference === 'light' || themePreference === 'dark') return themePreference
  if (defaultTheme    === 'light' || defaultTheme    === 'dark') return defaultTheme
  return 'dark'
}

function apiOrigin() {
  const base = import.meta.env.VITE_API_URL || ''
  return base.replace(/\/$/, '')
}

function absoluteLogoUrl(logoUrl) {
  if (!logoUrl) return null
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl
  return `${apiOrigin()}${logoUrl}`
}

export function BrandingProvider({ children }) {
  const { user, setUser } = useAuth()

  const branding = user?.branding || DEFAULT_BRANDING
  const themePreference = user?.theme_preference ?? null
  const theme = resolveTheme(themePreference, branding.default_theme)
  const logoUrl = useMemo(() => absoluteLogoUrl(branding.logo_url), [branding.logo_url])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', branding.primary_color || DEFAULT_BRANDING.primary_color)
    document.documentElement.dataset.theme = theme
  }, [branding.primary_color, theme])

  const setTheme = useCallback(async (nextTheme) => {
    const payload = (nextTheme === 'light' || nextTheme === 'dark') ? nextTheme : null
    const { data } = await meApi.setTheme(payload)
    setUser(data)
  }, [setUser])

  const updateBranding = useCallback(async (patch) => {
    const { data } = await meApi.updateBranding(patch)
    setUser(data)
  }, [setUser])

  const uploadLogo = useCallback(async (file) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await meApi.uploadLogo(form)
    setUser(data)
  }, [setUser])

  const deleteLogo = useCallback(async () => {
    const { data } = await meApi.deleteLogo()
    setUser(data)
  }, [setUser])

  const value = useMemo(() => ({
    branding,
    logoUrl,
    theme,
    themePreference,
    setTheme,
    updateBranding,
    uploadLogo,
    deleteLogo,
  }), [branding, logoUrl, theme, themePreference, setTheme, updateBranding, uploadLogo, deleteLogo])

  return <BrandingCtx.Provider value={value}>{children}</BrandingCtx.Provider>
}

export const useBranding = () => useContext(BrandingCtx)
