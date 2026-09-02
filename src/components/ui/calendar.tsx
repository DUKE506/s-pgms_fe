import * as React from "react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker";
import { ko } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "lucide-react";

// 이 테마에선 --muted/--accent가 --background와 같은 색이라 ghost variant의 기본
// hover(bg-muted)가 안 보인다. header 요소(좌우 화살표·캡션)는 일자 뷰와 연도
// 그리드 뷰가 똑같이 이 hover/라운드를 쓰도록 상수로 뽑아 공유한다.
const HEADER_HOVER =
  "hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_8%)]";
const HEADER_NAV_BUTTON = cn(
  "flex w-7 h-7  items-center justify-center rounded-sm p-0 transition-colors select-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  HEADER_HOVER,
);
const HEADER_CAPTION_BUTTON = cn(
  "cursor-pointer rounded-sm px-2 py-1 text-sm font-medium transition-colors select-none",
  HEADER_HOVER,
);

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale = ko,
  formatters,
  components,
  // 캡션(연·월)을 눌렀을 때 9칸 연도 그리드로 전환하는 opt-in 모드. 생년월일처럼
  // 오늘에서 수십 년 떨어진 날짜를 골라야 하는 필드에서만 켠다 — 배치기간처럼 최근
  // 날짜 위주인 곳은 기본값(off)으로 두면 기존 동작(월 화살표만) 그대로다.
  yearGrid = false,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  yearGrid?: boolean;
}) {
  const defaultClassNames = getDefaultClassNames();

  const [view, setView] = React.useState<"days" | "years">("days");
  // props.selected는 mode별 판별 유니온이라 직접 접근이 안 돼서 좁혀서 읽는다.
  const selectedProp = (props as { selected?: unknown }).selected;
  const selectedDate = selectedProp instanceof Date ? selectedProp : undefined;
  const [month, setMonth] = React.useState<Date>(
    () => props.defaultMonth ?? selectedDate ?? new Date(),
  );

  if (yearGrid && view === "years") {
    return (
      <YearGrid
        centerYear={month.getFullYear()}
        selectedYear={selectedDate?.getFullYear()}
        minYear={props.startMonth?.getFullYear()}
        maxYear={props.endMonth?.getFullYear()}
        buttonVariant={buttonVariant}
        className={className}
        onBack={() => setView("days")}
        onPick={(year) => {
          setMonth(new Date(year, month.getMonth(), 1));
          setView("days");
        }}
      />
    );
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      {...(yearGrid ? { month, onMonthChange: setMonth } : null)}
      className={cn(
        "group/calendar bg-background p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months,
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          // yearGrid이 켜지면 캡션이 클릭 대상이 되는데, 이 nav가 절대배치로 캡션
          // 행 전체를 덮고 있어 가운데(연·월 텍스트) 클릭이 nav에 먹혀버린다.
          // nav 컨테이너는 클릭을 통과시키고 실제 화살표 버튼만 다시 받게 한다.
          yearGrid && "pointer-events-none",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          yearGrid
            ? cn(HEADER_NAV_BUTTON, "pointer-events-auto")
            : cn(
                buttonVariants({ variant: buttonVariant }),
                "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
              ),
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          yearGrid
            ? cn(HEADER_NAV_BUTTON, "pointer-events-auto")
            : cn(
                buttonVariants({ variant: buttonVariant }),
                "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
              ),
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative rounded-(--cell-radius)",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
          defaultClassNames.weekday,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)"
            : "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
          defaultClassNames.day,
        ),
        range_start: cn(
          "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
          defaultClassNames.range_start,
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
          defaultClassNames.range_end,
        ),
        today: cn(
          "rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          );
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...(yearGrid
          ? {
              CaptionLabel: ({ children, className, ...labelProps }) => (
                <button
                  type="button"
                  onClick={() => setView("years")}
                  className={cn(
                    "relative z-10",
                    HEADER_CAPTION_BUTTON,
                    className,
                  )}
                  {...labelProps}
                >
                  {children}
                </button>
              ),
            }
          : null),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground [&>span]:text-xs",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

// 캡션을 눌렀을 때 뜨는 9칸(3×3) 연도 선택 그리드. 중앙(index 4)에 centerYear가
// 오도록 페이지를 잡고, ‹ › 로 9년씩 이동한다. minYear/maxYear 밖 연도는 비활성.
// 월 전용 뷰는 두지 않는다(요청) — 연도 선택 후 일 뷰로 돌아가 월 화살표로 조정.
function YearGrid({
  centerYear,
  selectedYear,
  minYear,
  maxYear,
  buttonVariant = "ghost",
  className,
  onPick,
  onBack,
}: {
  centerYear: number;
  selectedYear?: number;
  minYear?: number;
  maxYear?: number;
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
  onPick: (year: number) => void;
  onBack: () => void;
}) {
  const [pageStart, setPageStart] = React.useState(centerYear - 4);
  const years = Array.from({ length: 9 }, (_, i) => pageStart + i);
  const currentYear = new Date().getFullYear();

  return (
    <div
      data-slot="calendar"
      className={cn("w-fit bg-background p-2", className)}
    >
      {/* header — 좌우 화살표 + 가운데 연도 범위. YearGrid는 DayPicker root와
          별개로 렌더돼서 --cell-size/--cell-radius를 못 물려받으므로, 공유
          상수(HEADER_*)는 이 안에서 고정값(w-7 h-7 / rounded-sm)을 쓴다. */}
      <div className="mb-2 flex w-full items-center justify-between">
        <button
          type="button"
          aria-label="이전 9년"
          disabled={minYear != null && years[0] <= minYear}
          onClick={() => setPageStart((y) => y - 9)}
          className={HEADER_NAV_BUTTON}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={onBack}
          className={HEADER_CAPTION_BUTTON}
        >
          {years[0]}–{years[8]}
        </button>
        <button
          type="button"
          aria-label="다음 9년"
          disabled={maxYear != null && years[8] >= maxYear}
          onClick={() => setPageStart((y) => y + 9)}
          className={HEADER_NAV_BUTTON}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {years.map((year) => {
          const disabled =
            (minYear != null && year < minYear) ||
            (maxYear != null && year > maxYear);
          const isSelected = year === selectedYear;
          const isCurrent = year === currentYear;
          return (
            <button
              key={year}
              type="button"
              disabled={disabled}
              onClick={() => onPick(year)}
              className={cn(
                buttonVariants({
                  variant: isSelected ? "default" : buttonVariant,
                }),
                "h-9 cursor-pointer px-4 text-sm font-normal tabular-nums disabled:cursor-not-allowed disabled:opacity-50",
                // 비선택 셀 hover (이 테마에서 ghost 기본 hover가 안 보여서 명시)
                !isSelected && HEADER_HOVER,
                // 현재 연도는 배경 없이 테두리(ring 색)만. 배경은 '선택된 연도'에만.
                !isSelected && isCurrent && "border-ring",
              )}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { Calendar, CalendarDayButton };
