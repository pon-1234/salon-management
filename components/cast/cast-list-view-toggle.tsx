"use client"

import { Button } from "@/components/ui/button"
import { LayoutGrid, LayoutList } from 'lucide-react'

interface CastListViewToggleProps {
  view: "grid" | "list"
  onViewChange: (view: "grid" | "list") => void
}

export function CastListViewToggle({ view, onViewChange }: CastListViewToggleProps) {
  return (
    <div className="flex gap-2 p-4 border-b">
      <Button
        variant={view === "grid" ? "default" : "outline"}
        className={view === "grid" ? "bg-emerald-600" : ""}
        onClick={() => onViewChange("grid")}
      >
        <LayoutGrid className="w-4 h-4 mr-2" />
        グリッド
      </Button>
      <Button
        variant={view === "list" ? "default" : "outline"}
        className={view === "list" ? "bg-emerald-600" : ""}
        onClick={() => onViewChange("list")}
      >
        <LayoutList className="w-4 h-4 mr-2" />
        リスト
      </Button>
    </div>
  )
}