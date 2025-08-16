import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id,email')

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Profiles</h1>
      {error && (
        <p className="text-destructive">Error: {error.message}</p>
      )}
      <ul className="list-disc pl-6">
        {profiles?.map((p: { id: string; email: string }) => (
          <li key={p.id}>{p.email}</li>
        ))}
      </ul>
    </main>
  )
}
