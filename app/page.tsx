import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              A
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Agora ARIA</p>
              <p className="text-xs text-slate-500">Revenue intelligence</p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open CRM dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Agora Revenue Intelligence Agent
        </p>
        <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
          Voice-first sales intelligence that keeps your team focused on the next
          move.
        </h1>
        <p className="max-w-2xl text-lg leading-7 text-slate-600">
          ARIA turns live conversations into scores, tasks, and follow-ups so
          every lead stays on track without extra busywork.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Enter the CRM board
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="grid gap-8 border-t border-slate-200 pt-10 sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Live signals</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Surface urgency, next steps, and lead score changes during the
              call.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Instant follow-up</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Auto-generate summaries, tasks, and handoffs as soon as the call
              ends.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">CRM-ready</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Keep the pipeline tidy with an intuitive Kanban board built for
              sellers.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
