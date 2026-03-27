'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import styles from './AuthForm.module.css';

type Tab = 'signin' | 'signup';

export function AuthForm() {
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      setLoading(true);

      try {
        if (tab === 'signin') {
          const result = await signInWithEmail(email, password);
          if (result.error) setError(result.error);
        } else {
          const result = await signUpWithEmail(email, password);
          if (result.error) {
            setError(result.error);
          } else {
            setSuccess('Check your email for a confirmation link.');
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [tab, email, password, signInWithEmail, signUpWithEmail],
  );

  const handleGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // Redirect mode — page will navigate away
  }, [signInWithGoogle]);

  return (
    <div className={styles.authForm}>
      {/* Tab Toggle */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'signin' ? styles.tabActive : ''}`}
          onClick={() => { setTab('signin'); setError(null); setSuccess(null); }}
          type="button"
        >
          Sign In
        </button>
        <button
          className={`${styles.tab} ${tab === 'signup' ? styles.tabActive : ''}`}
          onClick={() => { setTab('signup'); setError(null); setSuccess(null); }}
          type="button"
        >
          Sign Up
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          className={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          aria-label="Email"
        />
        <input
          className={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
          aria-label="Password"
        />
        <button
          className={styles.submitBtn}
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <span className={styles.spinner} />
          ) : tab === 'signin' ? (
            'Sign In'
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Error / Success */}
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      {/* Divider */}
      <div className={styles.divider}>
        <span>or</span>
      </div>

      {/* Google OAuth */}
      <button
        className={styles.googleBtn}
        onClick={handleGoogle}
        disabled={loading}
        type="button"
      >
        <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>
    </div>
  );
}
