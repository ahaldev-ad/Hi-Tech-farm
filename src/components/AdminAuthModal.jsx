import React, { useState } from 'react';
import { Sprout, Lock, Eye, EyeOff, ArrowRight, ShieldAlert } from 'lucide-react';

export default function AdminAuthModal({ onAuthenticate }) {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'sheenaparadise') {
      localStorage.setItem('paradise_admin_authenticated', 'true');
      onAuthenticate();
    } else {
      setErrorMsg('Incorrect Admin Password. Please try again.');
      setPasswordInput('');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(252, 250, 246, 0.96)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.25rem'
    }}>
      <div className="card" style={{
        maxWidth: '400px',
        width: '100%',
        padding: '2rem 1.5rem',
        boxShadow: 'var(--shadow-lg)',
        border: '1.5px solid var(--border-color)',
        borderRadius: '16px',
        textAlign: 'center'
      }}>
        
        {/* Logo */}
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '14px',
          background: 'var(--primary-green-light)',
          border: '1px solid var(--primary-green-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary-green)',
          margin: '0 auto 1.25rem auto'
        }}>
          <Sprout size={30} />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
          Paradise Mushroom
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Admin Authentication Required
        </p>

        {/* Error Banner */}
        {errorMsg && (
          <div style={{
            padding: '0.625rem 0.875rem',
            background: '#FDF2F2',
            border: '1px solid #F87171',
            borderRadius: 'var(--radius-sm)',
            color: '#991B1B',
            fontSize: '0.75rem',
            fontWeight: 600,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Admin Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                autoFocus
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            <span>Access Dashboard</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
          <Lock size={12} />
          <span>Restricted Admin Portal • Device Session Lock</span>
        </div>

      </div>
    </div>
  );
}
