import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // text-field(13px, docs/PGMS_UI_mock.dc.html 실측값): 이전엔 모바일 폭에서
        // iOS 자동 확대 방지용으로 text-base(16px)를 따로 뒀으나, 뷰포트에
        // user-scalable=no를 적용해 확대 자체가 막혀 더 이상 필요 없어짐 —
        // breakpoint 무관하게 목업 크기로 통일(2026-09-15).
        "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-field transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
