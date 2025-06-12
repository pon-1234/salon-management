import { Header } from "@/components/header"

export default function CustomersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  )
}
