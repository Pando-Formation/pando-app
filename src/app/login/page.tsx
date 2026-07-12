import { signIn } from '@/lib/auth'

async function signInWithGoogle() {
  'use server'
  await signIn('google', { redirectTo: '/' })
}

async function signInWithEmail(formData: FormData) {
  'use server'
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  await signIn('nodemailer', { email, redirectTo: '/' })
}

export default function LoginPage() {
  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        PANDO
      </div>
      <h1 className="t-title-3" style={{ marginBottom: 'var(--space-7)' }}>
        Connexion
      </h1>

      <form action={signInWithGoogle} style={{ marginBottom: 'var(--space-8)' }}>
        <button type="submit" className="btn btn-md btn-primary" style={{ width: '100%' }}>
          Continuer avec Google
        </button>
        <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
          Réservé aux comptes @pando-formation.fr (administrateurs).
        </p>
      </form>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div style={{ flex: 1, height: 1, background: 'var(--color-border-default)' }} />
        <span className="t-caption-2">ou</span>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border-default)' }} />
      </div>

      <form action={signInWithEmail}>
        <label className="input-label" htmlFor="email">
          Adresse e-mail
        </label>
        <input
          className="input"
          type="email"
          name="email"
          id="email"
          placeholder="vous@exemple.com"
          required
          style={{ marginBottom: 'var(--space-5)' }}
        />
        <button type="submit" className="btn btn-md btn-secondary" style={{ width: '100%' }}>
          Recevoir un lien de connexion
        </button>
        <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
          Pour les formateurs — un lien à usage unique, valable 15 minutes.
        </p>
      </form>
    </>
  )
}
