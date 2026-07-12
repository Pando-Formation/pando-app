const MESSAGES: Record<string, string> = {
  AccessDenied:
    'Accès refusé. Votre compte Google doit appartenir au domaine pando-formation.fr, ou votre e-mail doit correspondre à un formateur actif.',
  Verification:
    "Ce lien de connexion a expiré ou a déjà été utilisé. Demandez-en un nouveau.",
  Configuration: "Erreur de configuration de l'authentification. Contactez un administrateur.",
  OAuthAccountNotLinked:
    'Ce compte Google est déjà associé à une autre méthode de connexion.',
}

const DEFAULT_MESSAGE = 'Une erreur est survenue lors de la connexion.'

export default async function LoginErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const message = (error && MESSAGES[error]) || DEFAULT_MESSAGE

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        PANDO
      </div>
      <h1 className="t-title-3" style={{ marginBottom: 'var(--space-4)' }}>
        Connexion impossible
      </h1>
      <p className="t-body" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-7)' }}>
        {message}
      </p>
      <a href="/login" className="btn btn-md btn-secondary" style={{ width: '100%' }}>
        Retour à la connexion
      </a>
    </>
  )
}
