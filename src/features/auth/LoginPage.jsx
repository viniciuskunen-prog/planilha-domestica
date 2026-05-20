import { useState } from 'react';
import { signInWithPassword, signUpWithPassword } from './authService.js';

export function LoginPage() {
  const [mode, setMode] = useState('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus('');

    const result = mode === 'sign-in'
      ? await signInWithPassword(email, password)
      : await signUpWithPassword({ email, password, displayName });

    if (result.error) {
      setStatus(result.error.message);
      setLoading(false);
      return;
    }

    if (mode === 'sign-up') {
      setStatus('Cadastro criado. Se o Supabase pedir confirmação de email, confirme antes de entrar.');
    }

    setLoading(false);
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">Planilha Doméstica</p>
        <h1>Entrar no rateio</h1>
        <p className="muted">Acesse o espaço compartilhado da casa.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'sign-up' && (
            <label>
              <span>Nome</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Vini" required />
            </label>
          )}

          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemplo.com" required />
          </label>

          <label>
            <span>Senha</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" required minLength={6} />
          </label>

          {status && <p className="form-status">{status}</p>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'sign-in' ? 'Entrar' : 'Criar acesso'}
          </button>
        </form>

        <button type="button" className="text-button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
          {mode === 'sign-in' ? 'Criar novo acesso' : 'Já tenho acesso'}
        </button>
      </section>
    </main>
  );
}
