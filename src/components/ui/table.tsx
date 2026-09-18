import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

// bg-slate-200: 목업 테이블 헤더 배경 실측값(docs/edit-ui, 2026-09-18 개편) —
// shadcn 기본은 헤더 배경이 없어서 추가. 하단 보더는 body 행 구분선과 동일한
// 스타일(기본 border 색 상속, 사용자 확인 2026-09-18)로 통일 — 별도 색 지정 없음.
// shadcn CLI로 table을 다시 add하면 이 수정도 함께 사라지니 재적용 필요 (button.tsx의 outline variant와 동일한 사정).
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-slate-200 [&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 active:bg-secondary has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

// text-table-header(11px/600), text-table-body(13px, TableCell 쪽): 목업 실측값
// (docs/PGMS_UI_mock.dc.html) 기준, shadcn 기본 text-sm(14px) 상속보다 작음 (2026-08-22).
// text-slate-500: 헤더 글자색 실측값(docs/edit-ui, 2026-09-18 개편) — 기존 text-foreground보다 옅음.
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-5 text-left align-middle text-table-header font-semibold whitespace-nowrap text-slate-500 text-trim [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "py-3.5 px-5 align-middle text-table-body whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
