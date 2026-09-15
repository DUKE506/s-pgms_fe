import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // text-field(13px) — Input/Select/DateField와 통일(2026-09-15, 기존엔
        // 데스크톱만 text-sm(14px)로 혼자 달랐음). 모바일 iOS 자동확대 방지용
        // 16px 예외는 뷰포트 user-scalable=no로 대체돼 제거.
        "field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-field transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
