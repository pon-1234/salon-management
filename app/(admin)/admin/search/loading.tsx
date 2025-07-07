export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="animate-pulse">
        <div className="mb-6 h-8 w-1/3 rounded bg-gray-200"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-32 rounded bg-gray-200"></div>
                  <div className="h-4 w-24 rounded bg-gray-200"></div>
                </div>
                <div className="h-9 w-20 rounded bg-gray-200"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
