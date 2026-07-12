export default function CheckEmailPage() {
  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        PANDO
      </div>
      <h1 className="t-title-3" style={{ marginBottom: 'var(--space-4)' }}>
        Vérifiez votre boîte mail
      </h1>
      <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
        Un lien de connexion vous a été envoyé. Il est valable 15 minutes et ne
        peut être utilisé qu&apos;une seule fois.
      </p>
    </>
  )
}
