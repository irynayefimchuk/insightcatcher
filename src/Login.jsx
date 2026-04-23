import React, { useState } from 'react';
import { signIn, signUp } from './supabase';

const t = {
  canvasBg: '#E9EEF3',
  cardBg: '#FFFFFF',
  brand: '#005CB7',
  textMain: '#022212',
  textSub: '#5E676F',
  textDetail: '#708090',
  positive: '#068252',
  negative: '#C3231D',
  strokeDefault: '#E0E3E6',
  hoverBg: '#E1EDFA',
};

export default function Login({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (result.error) {
        setError(result.error.message);
      } else {
        onAuthSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: t.canvasBg,
      padding: 24,
    }}>
      <div style={{
        background: t.cardBg,
        borderRadius: 12,
        padding: 40,
        maxWidth: 400,
        width: '100%',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: t.textMain, marginBottom: 8 }}>
          InsightCatcher
        </h1>
        <p style={{ fontSize: 14, color: t.textSub, marginBottom: 24 }}>
          {isSignUp ? 'Create a new account' : 'Sign in to your account'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.textMain, display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: `1px solid ${t.strokeDefault}`,
                borderRadius: 6,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.textMain, display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: `1px solid ${t.strokeDefault}`,
                borderRadius: 6,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: 12,
              background: '#FAD8D7',
              border: `1px solid ${t.negative}`,
              borderRadius: 6,
              color: t.negative,
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 16px',
              background: t.brand,
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '10px 16px',
            background: 'transparent',
            border: 'none',
            color: t.brand,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}
