export default function UserLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  )
}
