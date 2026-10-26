import Link from "next/link";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12 md:px-6">
      <Link href="/" className="text-sm text-text-muted hover:text-text">
        ← Telar
      </Link>
      <h1 className="mt-6 text-h1 font-bold">{title}</h1>
      <div className="mt-6 flex flex-col gap-4 text-base text-text [&_h2]:mt-4 [&_h2]:text-h3 [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-text-muted">{children}</div>
    </main>
  );
}
