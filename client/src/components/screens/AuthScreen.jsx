import { useState } from 'react';

/**
 * Combined login + register screen. Shown before the MainMenu whenever
 * the player isn't authenticated.
 *
 * The same form serves both actions — tab between "Sign in" and
 * "Create account". The parent `useAuth` hook owns the actual network
 * calls and token persistence.
 */
export default function AuthScreen({
  onLogin,
  onRegister,
  submitting,
  error,
  clearError,
}) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState(null);

  const isRegister = mode === 'register';

  const switchMode = (next) => {
    if (mode === next) return;
    setMode(next);
    setLocalError(null);
    clearError?.();
  };

  const submit = async (event) => {
    event.preventDefault();
    setLocalError(null);

    if (username.trim().length < 3) {
      setLocalError('Username must be at least 3 characters.');
      return;
    }
    if (!password) {
      setLocalError('Enter your password.');
      return;
    }
    if (isRegister) {
      if (password.length < 8) {
        setLocalError('Password must be at least 8 characters.');
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setLocalError('Password must include at least one capital letter.');
        return;
      }
      if (!/\d/.test(password)) {
        setLocalError('Password must include at least one number.');
        return;
      }
      if (password !== confirm) {
        setLocalError('Passwords do not match.');
        return;
      }
    }

    try {
      if (isRegister) {
        await onRegister(username.trim(), password);
      } else {
        await onLogin(username.trim(), password);
      }
    } catch {
      // error surfaced through the hook's `error` prop
    }
  };

  const displayError = localError ?? error;

  return (
    <div className="screen auth-screen">
      <div className="auth-card">
        <h1 className="auth-card__title">Knight's Gauntlet</h1>
        <p className="auth-card__subtitle">
          {isRegister
            ? 'Forge a new hero identity.'
            : 'Return to the gauntlet, brave knight.'}
        </p>

        <div className="auth-card__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            className={`auth-card__tab ${!isRegister ? 'is-active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            className={`auth-card__tab ${isRegister ? 'is-active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Create account
          </button>
        </div>

        <form className="auth-card__form" onSubmit={submit}>
          <label className="auth-card__label">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={24}
              required
            />
          </label>
          <label className="auth-card__label">
            <span>Password</span>
            <input
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={isRegister ? 8 : undefined}
              required
            />
          </label>
          {isRegister && (
            <label className="auth-card__label">
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
              />
            </label>
          )}

          <button
            type="submit"
            className="btn btn--primary auth-card__submit"
            disabled={submitting}
          >
            {submitting
              ? 'Working…'
              : isRegister
              ? 'Create account'
              : 'Sign in'}
          </button>

          {displayError && (
            <p className="auth-card__error" role="alert">
              {displayError}
            </p>
          )}
        </form>

        <p className="auth-card__hint">
          Your progress is saved to your account. No email required.
          {isRegister && (
            <>
              {' '}
              Use 8+ characters with at least one capital letter and one number.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
