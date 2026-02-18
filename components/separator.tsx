"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

function Separator({ className, orientation = "horizontal", decorative = true, ...props }: SeparatorProps) {
  const separatorProps = decorative
    ? {}
    : {
        role: "separator" as const,
        "aria-orientation": orientation as "horizontal" | "vertical",
      }

  return (
    <div
      {...separatorProps}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className,
      )}
      {...props}
    />
  )
}

export { Separator }
