export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-7)',
      }}
    >
      <div className="card card-elevated" style={{ width: '100%', maxWidth: 400 }}>
        {children}
      </div>
    </main>
  )
}
