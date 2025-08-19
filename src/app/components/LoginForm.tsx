'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isSignUp) {
        // Validaciones para registro
        if (!username.trim()) {
          setError('El nombre de usuario es requerido')
          return
        }

        if (username.length < 3) {
          setError('El nombre de usuario debe tener al menos 3 caracteres')
          return
        }

        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden')
          return
        }

        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres')
          return
        }

        const { error } = await signUp(email, password, username)
        if (error) {
          setError(error.message)
        } else {
          setMessage('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.')
          // Limpiar formulario después del registro exitoso
          setEmail('')
          setPassword('')
          setUsername('')
          setConfirmPassword('')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        }
      }
    } catch (err) {
      setError('Error inesperado. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--light-green)' }}>
      <div className="treetracker-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/treetracker-logo.svg"
            alt="TreeTracker Logo"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">
            {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h1>
          <p className="text-gray-600 mt-2">TreeTracker - Balance de Materiales</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-100 border-2 border-green-400 text-green-700 px-4 py-3 rounded-lg">
              {message}
            </div>
          )}

          {isSignUp && (
            <div>
              <label htmlFor="username" className="block mb-2 text-gray-700 font-medium">
                Nombre de Usuario
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full border-2 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${username && username.length < 3
                  ? 'border-red-400'
                  : username && username.length >= 3
                    ? 'border-green-400'
                    : ''
                  }`}
                style={{
                  borderColor: username && username.length < 3
                    ? '#f87171'
                    : username && username.length >= 3
                      ? '#4ade80'
                      : 'var(--light-brown)',
                  backgroundColor: 'white'
                }}
                required={isSignUp}
                disabled={loading}
                placeholder="Tu nombre de usuario"
                minLength={3}
              />
              {username && username.length < 3 && (
                <p className="text-red-600 text-sm mt-1">Mínimo 3 caracteres</p>
              )}
              {username && username.length >= 3 && (
                <p className="text-green-600 text-sm mt-1">Nombre de usuario válido ✓</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block mb-2 text-gray-700 font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{
                borderColor: 'var(--light-brown)',
                backgroundColor: 'white'
              }}
              required
              disabled={loading}
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block mb-2 text-gray-700 font-medium">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{
                borderColor: 'var(--light-brown)',
                backgroundColor: 'white'
              }}
              required
              disabled={loading}
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="block mb-2 text-gray-700 font-medium">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full border-2 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${confirmPassword && password !== confirmPassword
                  ? 'border-red-400'
                  : confirmPassword && password === confirmPassword
                    ? 'border-green-400'
                    : ''
                  }`}
                style={{
                  borderColor: confirmPassword && password !== confirmPassword
                    ? '#f87171'
                    : confirmPassword && password === confirmPassword
                      ? '#4ade80'
                      : 'var(--light-brown)',
                  backgroundColor: 'white'
                }}
                required={isSignUp}
                disabled={loading}
                placeholder="••••••••"
                minLength={6}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-600 text-sm mt-1">Las contraseñas no coinciden</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-green-600 text-sm mt-1">Las contraseñas coinciden ✓</p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full treetracker-button-primary py-3 rounded-lg font-medium flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isSignUp ? 'Creando cuenta...' : 'Iniciando sesión...'}
              </>
            ) : (
              isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
                setMessage('')
                // Limpiar campos al cambiar de modo
                setEmail('')
                setPassword('')
                setUsername('')
                setConfirmPassword('')
              }}
              className="text-gray-600 hover:text-gray-800 font-medium"
              disabled={loading}
            >
              {isSignUp
                ? '¿Ya tienes cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}