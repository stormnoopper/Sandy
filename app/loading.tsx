export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      {/* Soft blurred blobs in background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-chart-4/8 blur-3xl" />
        <div className="absolute left-1/4 top-1/2 h-48 w-48 rounded-full bg-chart-2/6 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-8 px-6 text-center">
        {/* Icon with pulse ring */}
        <div className="relative">
          {/* Outer pulse ring */}
          <div
            className="absolute inset-0 rounded-2xl bg-primary/20"
            style={{ animation: 'pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite' }}
          />
          {/* Icon box */}
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20 overflow-hidden"
            style={{ animation: 'float 3s ease-in-out infinite' }}
          >
            <img src="/loading.gif" alt="Loading" className="h-full w-full object-cover" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-1.5" style={{ animation: 'fadeInUp 0.5s 0.15s cubic-bezier(0.16,1,0.3,1) both' }}>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Sandy</h1>
          <p className="text-sm text-muted-foreground">กำลังโหลด…</p>
        </div>

        {/* Dot loader */}
        <div className="flex items-center gap-1.5" style={{ animation: 'fadeInUp 0.5s 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-primary/50"
              style={{
                animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
