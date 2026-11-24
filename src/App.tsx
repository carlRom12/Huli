export function App() {
  return (
    <main className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <header className="mb-6 flex items-center gap-1.5 text-3xl font-extrabold tracking-tight">
        huli
        <span aria-hidden="true" className="mt-2 size-2.5 rounded-full bg-amber" />
      </header>
      <section className="rounded-card border border-border bg-surface p-5 sm:p-7">
        <h1 className="text-2xl font-extrabold tracking-tight">Nothing tracked yet</h1>
        <p className="mt-2 text-muted">Keep track of when you last did the things you do regularly.</p>
      </section>
    </main>
  )
}
