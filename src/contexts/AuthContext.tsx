'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isVisionUser: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, username?: string) => Promise<{ error: unknown }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function checkIsVisionUser(userId: string): Promise<boolean> {
  try {
    const queryPromise = supabase
      .from('vision')
      .select('"user"')
      .eq('"user"', userId)
      .single()

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Vision user check timeout')), 8000)
    })

    const { data, error } = await Promise.race([queryPromise, timeoutPromise])

    if (error && error.code !== 'PGRST116') {
      console.error('Error verificando vision user:', error)
    }

    return !!data
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isVisionUser, setIsVisionUser] = useState(false)

  useEffect(() => {
    // Obtener sesión inicial y verificar si es Vision user
    let isMounted = true

    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const vision = await checkIsVisionUser(session.user.id)
          if (!isMounted) return
          setIsVisionUser(vision)
          console.group('👁️ VISION USER - Sesión inicial')
          console.log('Usuario ID:', session.user.id)
          console.log('Email:', session.user.email)
          console.log(vision ? '✅ ES usuario Vision (vista solo pallets)' : '❌ NO es usuario Vision (vista estándar)')
          console.groupEnd()
        } else {
          setIsVisionUser(false)
        }
      } catch (error) {
        console.error('Error inicializando sesión:', error)
        if (!isMounted) return
        setSession(null)
        setUser(null)
        setIsVisionUser(false)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initializeSession()

    // Escuchar cambios de autenticación (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setSession(session)
          setUser(session?.user ?? null)
          if (session?.user) {
            const vision = await checkIsVisionUser(session.user.id)
            setIsVisionUser(vision)
            console.group(`👁️ VISION USER - Evento: ${event}`)
            console.log('Usuario ID:', session.user.id)
            console.log('Email:', session.user.email)
            console.log(vision ? '✅ ES usuario Vision (vista solo pallets)' : '❌ NO es usuario Vision (vista estándar)')
            console.groupEnd()
          } else {
            setIsVisionUser(false)
            console.log('👁️ VISION USER: Sin sesión activa → isVisionUser = false')
          }
        } catch (error) {
          console.error('Error en onAuthStateChange:', error)
          setIsVisionUser(false)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, username?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || '',
          display_name: username || '',
        }
      }
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    loading,
    isVisionUser,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
