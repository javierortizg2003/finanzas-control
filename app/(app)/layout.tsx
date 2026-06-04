import Navigation from "@/components/Navigation"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main className="md:ml-60 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
    </>
  )
}
