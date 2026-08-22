import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// src/index.css의 @theme에 정의한 커스텀 text-* 토큰(table-header, table-body,
// label, input, button)을 tailwind-merge에 등록 — 이걸 안 해두면 cn()이
// text-table-header 같은 커스텀 크기와 shadcn 기본 text-sm을 같은 그룹(font-size)
// 충돌로 인식하지 못해서 dedupe되지 않고 둘 다 클래스에 남아버린다.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["table-header", "table-body", "label", "field", "button"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
