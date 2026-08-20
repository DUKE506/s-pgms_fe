interface ScreenPlaceholderProps {
  label: string
  screenIds: string[]
}

// roadmap Phase 1-4에서 화면이 만들어질 때마다 하나씩 실제 컴포넌트로 교체된다.
function ScreenPlaceholder({ label, screenIds }: ScreenPlaceholderProps) {
  return (
    <main className="p-8">
      <h1 className="text-xl font-bold text-foreground">{label}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        구현 예정 (목업 화면: {screenIds.join(', ')})
      </p>
    </main>
  )
}

export default ScreenPlaceholder
