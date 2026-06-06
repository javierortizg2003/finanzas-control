"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  BarChart3, Flame, Save, CheckCircle2, AlertTriangle,
  Home, Sparkles, PiggyBank, Info,
  ShieldCheck, Zap, Globe, DollarSign, Settings2,
  ChevronDown, Calendar, Copy,
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, calculateFIRENumber, calculateYearsToFIRE, formatPercent } from "@/lib/utils"
import MaskedAmount from "@/components/ui/MaskedAmount"

/* ─── Types ─── */
interface BudgetRule { needsPct: number; wantsPct: number; savingsPct: number }
interface CatRow {
  id: string | null; name: string; macro: string | null; color: string
  budgetQ1: number; budgetQ2: number
  actualQ1: number; actualQ2: number
}
interface MacroTotals { budgetQ1: number; budgetQ2: number; actualQ1: number; actualQ2: number }
interface Summary {
  income: { q1: number; q2: number; monthly: number }
  categories: CatRow[]
  byMacro: Record<string, MacroTotals>
  rule: BudgetRule
  month: string; monthNum: number; year: number; lastDay: number
}

/* ─── Constants ─── */
const MACROS = [
  { key: "Necesidades",      Icon: Home,      color: "#10B981", label: "Necesidades",      pctKey: "needsPct"   as const },
  { key: "Deseos",           Icon: Sparkles,  color: "#6366F1", label: "Deseos",           pctKey: "wantsPct"   as const },
  { key: "Ahorro/Inversión", Icon: PiggyBank, color: "#F59E0B", label: "Ahorro/Inversión", pctKey: "savingsPct" as const },
]

interface Preset { key: string; label: string; desc: string; Icon: React.ElementType; rule: BudgetRule }
const PRESETS: Preset[] = [
  { key: "50-30-20", label: "50/30/20", desc: "La más popular",    Icon: BarChart3,   rule: { needsPct: 50, wantsPct: 30, savingsPct: 20 } },
  { key: "70-10-20", label: "70/10/20", desc: "Para iniciar",      Icon: ShieldCheck, rule: { needsPct: 70, wantsPct: 10, savingsPct: 20 } },
  { key: "fire",     label: "FIRE",     desc: "Retiro anticipado", Icon: Zap,         rule: { needsPct: 40, wantsPct: 10, savingsPct: 50 } },
  { key: "latam",    label: "LATAM",    desc: "Contexto regional", Icon: Globe,       rule: { needsPct: 45, wantsPct: 15, savingsPct: 40 } },
]

const barColor = (pct: number) => {
  if (pct >= 100) return "#EF4444"
  if (pct >= 85)  return "#F97316"
  if (pct >= 70)  return "#F59E0B"
  return "#10B981"
}

/* ─── Stacked bar (macro colors) ─── */
function StackedBar({ segments, totalBudget, height = 10 }: {
  segments: { amount: number; color: string; name: string }[]
  totalBudget: number
  height?: number
}) {
  if (totalBudget === 0) return null
  const filled = segments.filter((s) => s.amount > 0)
  return (
    <div className="rounded-full overflow-hidden flex gap-px" style={{ height, background: "rgba(255,255,255,0.06)" }}>
      {filled.map((seg, i) => (
        <div key={i} className="h-full transition-all duration-500 shrink-0"
          style={{ width: `${Math.min((seg.amount / totalBudget) * 100, 100)}%`, background: seg.color }} />
      ))}
    </div>
  )
}

/* ─── Mini stacked bar (rule) ─── */
function RuleBar({ needsPct, wantsPct, savingsPct, height = 6 }: BudgetRule & { height?: number }) {
  return (
    <div className="flex rounded-full overflow-hidden" style={{ height, gap: 2 }}>
      <div style={{ flex: needsPct,   background: "#10B981" }} />
      <div style={{ flex: wantsPct,   background: "#6366F1" }} />
      <div style={{ flex: savingsPct, background: "#F59E0B" }} />
    </div>
  )
}

/* ─── Mi Presupuesto ─── */
function MiPresupuesto({ cats, byMacroLocal, month }: {
  cats: CatRow[]
  byMacroLocal: Record<string, MacroTotals>
  month: string
}) {
  const totalBudget = cats.reduce((s, c) => s + c.budgetQ1 + c.budgetQ2, 0)
  const totalActual = cats.reduce((s, c) => s + c.actualQ1 + c.actualQ2, 0)
  const surplus     = totalBudget - totalActual
  const totalPct    = totalBudget > 0 ? Math.min((totalActual / totalBudget) * 100, 100) : 0
  const hasData     = totalBudget > 0 || totalActual > 0

  if (!hasData) return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 size={15} style={{ color: "#F59E0B" }} />
        <h2 className="text-sm font-semibold text-white">Mi Presupuesto</h2>
        <span className="text-xs" style={{ color: "#475569" }}>· {month}</span>
      </div>
      <p className="text-xs" style={{ color: "#475569" }}>
        Aún no hay gastos ni presupuesto registrado para este mes.
      </p>
    </div>
  )

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      {/* Title + surplus chip */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 size={15} style={{ color: "#F59E0B" }} />
          <h2 className="text-sm font-semibold text-white">Mi Presupuesto</h2>
          <span className="text-xs" style={{ color: "#475569" }}>· {month}</span>
        </div>
        {totalBudget > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: surplus >= 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)" }}>
            <span className="text-xs" style={{ color: surplus >= 0 ? "#10B981" : "#EF4444" }}>
              {surplus >= 0 ? "Te sobran" : "Te pasaste"}
            </span>
            <span className="text-sm font-bold" style={{ color: surplus >= 0 ? "#10B981" : "#EF4444" }}>
              <MaskedAmount amount={Math.abs(surplus)} />
            </span>
          </div>
        )}
      </div>

      {/* Overall bar or simple total */}
      {totalBudget > 0 ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span style={{ color: "#64748B" }}>Gastado: <MaskedAmount amount={totalActual} /></span>
            <span style={{ color: "#64748B" }}>{Math.round(totalPct)}% de <MaskedAmount amount={totalBudget} /></span>
          </div>
          <StackedBar
            segments={MACROS.map((m) => {
              const t = byMacroLocal[m.key] ?? { actualQ1: 0, actualQ2: 0, budgetQ1: 0, budgetQ2: 0 }
              return { amount: t.actualQ1 + t.actualQ2, color: m.color, name: m.label }
            })}
            totalBudget={totalBudget}
            height={12}
          />
          <div className="flex gap-4 pt-0.5">
            {MACROS.map((m) => {
              const t = byMacroLocal[m.key] ?? { actualQ1: 0, actualQ2: 0 }
              if ((t.actualQ1 + t.actualQ2) === 0) return null
              return (
                <span key={m.key} className="flex items-center gap-1 text-xs" style={{ color: "#64748B" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                  {m.label}
                </span>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-xs" style={{ color: "#64748B" }}>Total gastado este mes</span>
          <span className="text-base font-bold text-white"><MaskedAmount amount={totalActual} /></span>
        </div>
      )}

      {/* Per-macro cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {MACROS.map((macro) => {
          const t      = byMacroLocal[macro.key] ?? { budgetQ1: 0, budgetQ2: 0, actualQ1: 0, actualQ2: 0 }
          const budget = t.budgetQ1 + t.budgetQ2
          const actual = t.actualQ1 + t.actualQ2
          if (budget === 0 && actual === 0) return null

          const pct  = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0
          const left = budget - actual
          const macroCats = cats.filter((c) => c.macro === macro.key && (c.actualQ1 + c.actualQ2 + c.budgetQ1 + c.budgetQ2) > 0)

          return (
            <div key={macro.key} className="rounded-xl p-3.5 space-y-2.5"
              style={{ background: `${macro.color}0A`, border: `1px solid ${macro.color}20` }}>

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `${macro.color}18` }}>
                    <macro.Icon size={13} style={{ color: macro.color }} />
                  </div>
                  <span className="text-xs font-semibold text-white">{macro.label}</span>
                </div>
                {budget > 0 && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: left >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)",
                             color: left >= 0 ? "#10B981" : "#EF4444" }}>
                    {left >= 0 ? "+" : "−"}<MaskedAmount amount={Math.abs(left)} />
                  </span>
                )}
              </div>

              {/* Bar or spending-only */}
              {budget > 0 ? (
                <>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: macro.color }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "#94A3B8" }}><MaskedAmount amount={actual} /></span>
                    <span style={{ color: "#64748B" }}>{Math.round(pct)}% / <MaskedAmount amount={budget} /></span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#64748B" }}>Gastado</span>
                  <span className="font-semibold text-white"><MaskedAmount amount={actual} /></span>
                </div>
              )}

              {/* Per-category mini section */}
              {macroCats.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t" style={{ borderColor: `${macro.color}18` }}>
                  {macroCats.map((c) => {
                    const cb   = c.budgetQ1 + c.budgetQ2
                    const ca   = c.actualQ1 + c.actualQ2
                    if (ca === 0 && cb === 0) return null
                    const cp   = cb > 0 ? Math.min((ca / cb) * 100, 100) : 0
                    const over = cb > 0 && ca > cb

                    return (
                      <div key={c.name}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="flex items-center gap-1.5 min-w-0 truncate text-xs font-medium" style={{ color: "#CBD5E1" }}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                            <span className="truncate">{c.name}</span>
                          </span>
                          {cb > 0 && (
                            <span className="text-xs shrink-0 ml-2 font-semibold"
                              style={{ color: over ? "#EF4444" : c.color }}>
                              {Math.round(cp)}%
                            </span>
                          )}
                        </div>
                        {/* Labels */}
                        <div className="flex justify-between text-xs mb-1" style={{ color: "#475569" }}>
                          {cb > 0 ? (
                            <>
                              <span>Presupuesto: <MaskedAmount amount={cb} /></span>
                              <span>Gastado: <MaskedAmount amount={ca} /></span>
                              <span style={{ color: over ? "#EF4444" : "#10B981" }}>
                                {over ? "Exceso" : "Sobra"}: <MaskedAmount amount={Math.abs(cb - ca)} />
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ color: "#64748B" }}>Sin presupuesto</span>
                              <span className="font-medium text-white">Gastado: <MaskedAmount amount={ca} /></span>
                            </>
                          )}
                        </div>
                        {cb > 0 && (
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${cp}%`, background: over ? "#EF4444" : c.color }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Budget input cell ─── */
function BudgetCell({ cat, half, monthNum, year, onSave }: {
  cat: CatRow; half: 1 | 2; monthNum: number; year: number
  onSave: (name: string, half: 1 | 2, amount: number) => void
}) {
  const initial = half === 1 ? cat.budgetQ1 : cat.budgetQ2
  const [val, setVal] = useState(initial > 0 ? initial.toString() : "")
  const prev    = useRef(initial)

  useEffect(() => {
    const v = half === 1 ? cat.budgetQ1 : cat.budgetQ2
    setVal(v > 0 ? v.toString() : "")
    prev.current = v
  }, [cat.budgetQ1, cat.budgetQ2, half])

  const handleBlur = async () => {
    const amount = parseFloat(val) || 0
    if (amount === prev.current) return
    prev.current = amount
    onSave(cat.name, half, amount)
    await fetch("/api/budget/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: cat.name, amount, month: monthNum, year, half }),
    })
  }

  return (
    <div className="relative w-20">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#475569" }}>$</span>
      <input type="number" min="0" step="1" placeholder="—"
        value={val} onChange={(e) => setVal(e.target.value)} onBlur={handleBlur}
        className="w-full pl-5 pr-1 py-1.5 rounded-lg text-right text-xs"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#F1F5F9", outline: "none" }} />
    </div>
  )
}

/* ─── Category row ─── */
function CategoryTableRow({ cat, monthNum, year, onBudgetSave }: {
  cat: CatRow; monthNum: number; year: number
  onBudgetSave: (name: string, half: 1 | 2, amount: number) => void
}) {
  const q1Over   = cat.actualQ1 > cat.budgetQ1 && cat.budgetQ1 > 0
  const q2Over   = cat.actualQ2 > cat.budgetQ2 && cat.budgetQ2 > 0
  const q1BarPct = cat.budgetQ1 > 0 ? Math.min((cat.actualQ1 / cat.budgetQ1) * 100, 100) : 0
  const q2BarPct = cat.budgetQ2 > 0 ? Math.min((cat.actualQ2 / cat.budgetQ2) * 100, 100) : 0

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      <div className="flex items-center gap-2 py-2.5 text-xs">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
        <span className="text-sm text-white flex-1 min-w-0 truncate">{cat.name}</span>
        <BudgetCell cat={cat} half={1} monthNum={monthNum} year={year} onSave={onBudgetSave} />
        <div className="w-20 text-right shrink-0 font-medium" style={{ color: q1Over ? "#EF4444" : "#94A3B8" }}>
          <MaskedAmount amount={cat.actualQ1} />
          {q1Over && <AlertTriangle size={10} className="inline ml-1" style={{ color: "#EF4444" }} />}
        </div>
        <div className="w-px h-6 shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
        <BudgetCell cat={cat} half={2} monthNum={monthNum} year={year} onSave={onBudgetSave} />
        <div className="w-20 text-right shrink-0 font-medium" style={{ color: q2Over ? "#EF4444" : "#94A3B8" }}>
          <MaskedAmount amount={cat.actualQ2} />
          {q2Over && <AlertTriangle size={10} className="inline ml-1" style={{ color: "#EF4444" }} />}
        </div>
      </div>
      {(cat.budgetQ1 > 0 || cat.budgetQ2 > 0) && (
        <div className="ml-4 mb-2 grid grid-cols-2 gap-1 pr-2" style={{ columnGap: "calc(20px + 80px + 1px)" }}>
          <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            {cat.budgetQ1 > 0 && <div className="h-full rounded-full" style={{ width: `${q1BarPct}%`, background: q1Over ? "#EF4444" : cat.color }} />}
          </div>
          <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            {cat.budgetQ2 > 0 && <div className="h-full rounded-full" style={{ width: `${q2BarPct}%`, background: q2Over ? "#EF4444" : cat.color }} />}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Macro section ─── */
function MacroSection({ macro, cats, totals, monthNum, year, onBudgetSave }: {
  macro: typeof MACROS[0]; cats: CatRow[]
  totals: MacroTotals; monthNum: number; year: number
  onBudgetSave: (name: string, half: 1 | 2, amount: number) => void
}) {
  const q1Over = totals.actualQ1 > totals.budgetQ1 && totals.budgetQ1 > 0
  const q2Over = totals.actualQ2 > totals.budgetQ2 && totals.budgetQ2 > 0

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="h-1" style={{ background: macro.color }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${macro.color}18` }}>
              <macro.Icon size={16} style={{ color: macro.color }} />
            </div>
            <p className="font-semibold text-white text-sm">{macro.label}</p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="text-right">
              <p className="text-xs mb-0.5" style={{ color: "#475569" }}>Q1 pres. / real</p>
              <p style={{ color: q1Over ? "#EF4444" : macro.color }} className="font-semibold">
                <MaskedAmount amount={totals.budgetQ1} /> / <MaskedAmount amount={totals.actualQ1} />
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs mb-0.5" style={{ color: "#475569" }}>Q2 pres. / real</p>
              <p style={{ color: q2Over ? "#EF4444" : macro.color }} className="font-semibold">
                <MaskedAmount amount={totals.budgetQ2} /> / <MaskedAmount amount={totals.actualQ2} />
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Q1 · 1–15",   budget: totals.budgetQ1, actual: totals.actualQ1, over: q1Over },
            { label: "Q2 · 16–fin", budget: totals.budgetQ2, actual: totals.actualQ2, over: q2Over },
          ].map(({ label, budget, actual, over }) => {
            const pct = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0
            return (
              <div key={label} className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex justify-between text-xs mb-2">
                  <span style={{ color: "#64748B" }}>{label}</span>
                  <span style={{ color: over ? "#EF4444" : "#94A3B8" }}>{budget > 0 ? `${Math.round(pct)}%` : "—"}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: budget > 0 ? `${pct}%` : "0%", background: over ? "#EF4444" : macro.color }} />
                </div>
                <div className="flex justify-between text-xs mt-1.5">
                  <span style={{ color: "#475569" }}>Pres: <MaskedAmount amount={budget} /></span>
                  <span style={{ color: over ? "#EF4444" : "#94A3B8" }}>Real: <MaskedAmount amount={actual} /></span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="w-2 shrink-0" />
          <span className="flex-1 text-xs" style={{ color: "#475569" }}>Categoría</span>
          <span className="w-20 text-right text-xs shrink-0" style={{ color: "#64748B" }}>Pres. Q1</span>
          <span className="w-20 text-right text-xs shrink-0" style={{ color: "#64748B" }}>Real Q1</span>
          <div className="w-px shrink-0" />
          <span className="w-20 text-right text-xs shrink-0" style={{ color: "#6366F1" }}>Pres. Q2</span>
          <span className="w-20 text-right text-xs shrink-0" style={{ color: "#6366F1" }}>Real Q2</span>
        </div>
        {cats.length > 0 ? cats.map((c) => (
          <CategoryTableRow key={c.name} cat={c} monthNum={monthNum} year={year} onBudgetSave={onBudgetSave} />
        )) : (
          <p className="text-xs py-4 text-center" style={{ color: "#475569" }}>Sin categorías en este grupo.</p>
        )}
      </div>
    </div>
  )
}

/* ─── Unclassified ─── */
function UnclassifiedSection({ cats, monthNum, year, onAssign, onBudgetSave }: {
  cats: CatRow[]; monthNum: number; year: number
  onAssign: (id: string, name: string, macro: string) => void
  onBudgetSave: (name: string, half: 1 | 2, amount: number) => void
}) {
  if (cats.length === 0) return null
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="h-1" style={{ background: "#475569" }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(100,116,139,0.15)" }}>
            <Info size={15} style={{ color: "#64748B" }} />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Sin clasificar</p>
            <p className="text-xs" style={{ color: "#475569" }}>Asigna el grupo de cada categoría para incluirla en el desglose</p>
          </div>
        </div>
        {cats.map((c) => (
          <div key={c.name} className="flex items-center gap-2 py-2.5 border-b last:border-b-0 text-xs"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
            <span className="text-sm text-white flex-1 min-w-0 truncate">{c.name}</span>
            <select defaultValue=""
              onChange={async (e) => {
                const macro = e.target.value
                if (!macro || !c.id) return
                await fetch(`/api/categories/${c.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ macro }),
                })
                onAssign(c.id, c.name, macro)
              }}
              className="w-32 text-xs rounded-lg px-2 py-1.5 shrink-0"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94A3B8", outline: "none" }}>
              <option value="" disabled>Asignar...</option>
              <option value="Necesidades">Necesidades</option>
              <option value="Deseos">Deseos</option>
              <option value="Ahorro/Inversión">Ahorro/Inversión</option>
            </select>
            <BudgetCell cat={c} half={1} monthNum={monthNum} year={year} onSave={onBudgetSave} />
            <div className="w-16 text-right" style={{ color: "#94A3B8" }}><MaskedAmount amount={c.actualQ1} /></div>
            <div className="w-px h-5 shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
            <BudgetCell cat={c} half={2} monthNum={monthNum} year={year} onSave={onBudgetSave} />
            <div className="w-16 text-right" style={{ color: "#94A3B8" }}><MaskedAmount amount={c.actualQ2} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Page ─── */
export default function PresupuestoPage() {
  const [summary,        setSummary]        = useState<Summary | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [cats,           setCats]           = useState<CatRow[]>([])
  const [activePreset,   setActivePreset]   = useState("50-30-20")
  const [ruleSaving,     setRuleSaving]     = useState(false)
  const [ruleSaved,      setRuleSaved]      = useState(false)
  const [expectedSalary, setExpectedSalary] = useState("")
  // month selector
  const [selMonth,       setSelMonth]       = useState<{ month: number; year: number } | null>(null)
  const [availMonths,    setAvailMonths]    = useState<{ month: number; year: number }[]>([])
  const [showPicker,     setShowPicker]     = useState(false)
  const [copying,        setCopying]        = useState(false)
  const [copiedOk,       setCopiedOk]       = useState(false)
  // FIRE
  const [monthlyExpenses, setMonthlyExpenses] = useState("")
  const [currentSavings,  setCurrentSavings]  = useState("")
  const [monthlySavings,  setMonthlySavings]  = useState("")

  const nowRef   = new Date()
  const viewMonth = selMonth ?? { month: nowRef.getMonth() + 1, year: nowRef.getFullYear() }
  const isCurrentMonth = !selMonth

  const monthLabel = (m: number, y: number) => {
    const s = new Date(y, m - 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const [s, r]: [Summary, BudgetRule] = await Promise.all([
        fetch(`/api/budget/summary?month=${viewMonth.month}&year=${viewMonth.year}`).then((r) => r.json()),
        fetch("/api/budget-rule").then((r) => r.json()),
      ])
      setSummary(s)
      setCats(s.categories ?? [])
      const match = PRESETS.find((p) => p.rule.needsPct === r.needsPct && p.rule.wantsPct === r.wantsPct && p.rule.savingsPct === r.savingsPct)
      setActivePreset(match?.key ?? "50-30-20")
    } finally { setLoading(false) }
  }, [viewMonth.month, viewMonth.year])

  useEffect(() => {
    const saved = localStorage.getItem("expectedSalary")
    if (saved) setExpectedSalary(saved)
    fetch("/api/budget/months").then((r) => r.json()).then(setAvailMonths).catch(() => {})
  }, [])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  const handleCopyPrevMonth = async () => {
    setCopying(true)
    try {
      const prev = viewMonth.month === 1
        ? { month: 12, year: viewMonth.year - 1 }
        : { month: viewMonth.month - 1, year: viewMonth.year }
      const prevData: Summary = await fetch(`/api/budget/summary?month=${prev.month}&year=${prev.year}`).then((r) => r.json())
      const hasBudget = prevData.categories.some((c) => c.budgetQ1 > 0 || c.budgetQ2 > 0)
      if (!hasBudget) { alert(`${monthLabel(prev.month, prev.year)} no tiene presupuesto guardado.`); return }
      const reqs: Promise<Response>[] = prevData.categories.flatMap((c) => {
        const out: Promise<Response>[] = []
        if (c.budgetQ1 > 0) out.push(fetch("/api/budget/categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: c.name, amount: c.budgetQ1, month: viewMonth.month, year: viewMonth.year, half: 1 }) }))
        if (c.budgetQ2 > 0) out.push(fetch("/api/budget/categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: c.name, amount: c.budgetQ2, month: viewMonth.month, year: viewMonth.year, half: 2 }) }))
        return out
      })
      await Promise.all(reqs)
      await fetchSummary()
      setCopiedOk(true)
      setTimeout(() => setCopiedOk(false), 2500)
    } finally { setCopying(false) }
  }

  const handleBudgetSave = (name: string, half: 1 | 2, amount: number) =>
    setCats((prev) => prev.map((c) =>
      c.name === name ? { ...c, budgetQ1: half === 1 ? amount : c.budgetQ1, budgetQ2: half === 2 ? amount : c.budgetQ2 } : c
    ))

  const handleAssignMacro = (id: string, name: string, macro: string) =>
    setCats((prev) => prev.map((c) => c.id === id || c.name === name ? { ...c, macro } : c))

  const currentRule = PRESETS.find((p) => p.key === activePreset)!.rule

  const handleSaveRule = async () => {
    setRuleSaving(true)
    try {
      await fetch("/api/budget-rule", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(currentRule) })
      setRuleSaved(true)
      setTimeout(() => setRuleSaved(false), 2500)
    } finally { setRuleSaving(false) }
  }

  const salaryNum    = parseFloat(expectedSalary) || 0
  const income       = salaryNum || (summary?.income.monthly ?? 0)
  const classified   = cats.filter((c) => c.macro !== null)
  const unclassified = cats.filter((c) => c.macro === null)

  const byMacroLocal: Record<string, MacroTotals> = {}
  for (const c of cats) {
    const key = c.macro ?? "Sin clasificar"
    if (!byMacroLocal[key]) byMacroLocal[key] = { budgetQ1: 0, budgetQ2: 0, actualQ1: 0, actualQ2: 0 }
    byMacroLocal[key].budgetQ1 += c.budgetQ1
    byMacroLocal[key].budgetQ2 += c.budgetQ2
    byMacroLocal[key].actualQ1 += c.actualQ1
    byMacroLocal[key].actualQ2 += c.actualQ2
  }

  const expensesNum = parseFloat(monthlyExpenses) || 0
  const savingsNum  = parseFloat(currentSavings)  || 0
  const mSavingsNum = parseFloat(monthlySavings)   || 0
  const fireNumber  = calculateFIRENumber(expensesNum)
  const yearsToFire = calculateYearsToFIRE(savingsNum, mSavingsNum, expensesNum)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 style={{ color: "#F59E0B" }} /> Presupuesto Vivo
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
            Define cuánto esperas gastar en cada quincena y compara con lo real
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month selector */}
          <div className="relative">
            <button onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#CBD5E1" }}>
              <Calendar size={13} style={{ color: "#64748B" }} />
              {monthLabel(viewMonth.month, viewMonth.year)}
              <ChevronDown size={13} style={{ color: "#64748B" }} />
            </button>
            {showPicker && (
              <div className="absolute top-full mt-1 right-0 z-50 rounded-xl overflow-hidden min-w-48 shadow-xl"
                style={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)" }}>
                {availMonths.map((m) => {
                  const isSel = m.month === viewMonth.month && m.year === viewMonth.year
                  return (
                    <button key={`${m.year}-${m.month}`}
                      onClick={() => { setSelMonth(m.month === nowRef.getMonth() + 1 && m.year === nowRef.getFullYear() ? null : m); setShowPicker(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                      style={{ color: isSel ? "#F59E0B" : "#CBD5E1", background: isSel ? "rgba(245,158,11,0.08)" : "transparent" }}>
                      {monthLabel(m.month, m.year)}
                      {m.month === nowRef.getMonth() + 1 && m.year === nowRef.getFullYear() && (
                        <span className="ml-2 text-xs" style={{ color: "#475569" }}>· actual</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Copy prev month */}
          {isCurrentMonth && (
            <button onClick={handleCopyPrevMonth} disabled={copying}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#818CF8" }}>
              <Copy size={13} />
              {copying ? "Copiando..." : copiedOk ? "¡Copiado!" : "Copiar mes anterior"}
            </button>
          )}

          <Link href="/presupuesto/categorias"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all shrink-0"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#F59E0B" }}>
            <Settings2 size={13} /> Categorías
          </Link>
        </div>
      </div>

      {/* Expected salary + real income */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={15} style={{ color: "#10B981" }} />
          <h2 className="text-sm font-semibold text-white">Ingreso de referencia</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>
              Salario mensual esperado
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm" style={{ color: "#475569" }}>$</span>
              <input type="number" min="0" step="100" placeholder="Ej: 20000"
                className="input-dark pl-7" value={expectedSalary}
                onChange={(e) => { setExpectedSalary(e.target.value); localStorage.setItem("expectedSalary", e.target.value) }} />
            </div>
            <p className="text-xs mt-1" style={{ color: "#475569" }}>Usado para calcular los objetivos de cada grupo</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <p className="text-xs mb-1" style={{ color: "#64748B" }}>Ingresos reales este mes</p>
            <p className="text-xl font-bold text-emerald-400"><MaskedAmount amount={summary?.income.monthly ?? 0} /></p>
            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
              Q1: <MaskedAmount amount={summary?.income.q1 ?? 0} /> · Q2: <MaskedAmount amount={summary?.income.q2 ?? 0} />
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <p className="text-xs mb-1" style={{ color: "#64748B" }}>Referencia activa</p>
            <p className="text-xl font-bold" style={{ color: "#F59E0B" }}><MaskedAmount amount={income} /></p>
            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
              {salaryNum > 0 ? "Salario esperado ingresado" : "Ingresos reales del mes"}
            </p>
          </div>
        </div>
      </div>

      {/* Mi Presupuesto */}
      {!loading && summary && (
        <MiPresupuesto cats={cats} byMacroLocal={byMacroLocal} month={summary.month} />
      )}

      {/* Category breakdown */}
      {loading ? (
        <div className="glass-card rounded-2xl p-16 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        </div>
      ) : summary ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">
              Desglose por categoría · {summary.month}
            </p>
            <p className="text-xs" style={{ color: "#475569" }}>
              Pon cuánto esperas gastar en Q1 (1–15) y Q2 (16–{summary.lastDay}) — se guarda al salir del campo
            </p>
          </div>
          {MACROS.map((macro) => {
            const macroTotals = byMacroLocal[macro.key] ?? { budgetQ1: 0, budgetQ2: 0, actualQ1: 0, actualQ2: 0 }
            return (
              <MacroSection key={macro.key} macro={macro}
                cats={classified.filter((c) => c.macro === macro.key)}
                totals={macroTotals} monthNum={summary.monthNum} year={summary.year}
                onBudgetSave={handleBudgetSave} />
            )
          })}
          <UnclassifiedSection cats={unclassified} monthNum={summary.monthNum} year={summary.year}
            onAssign={handleAssignMacro} onBudgetSave={handleBudgetSave} />
        </div>
      ) : null}

      {/* Distribution rule */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={15} style={{ color: "#F59E0B" }} />
          <h2 className="text-sm font-semibold text-white">Regla de distribución</h2>
          <span className="text-xs ml-1" style={{ color: "#475569" }}>— referencia de % por grupo</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {PRESETS.map((p) => {
            const active = activePreset === p.key
            return (
              <button key={p.key} onClick={() => setActivePreset(p.key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all shrink-0"
                style={{ background: active ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? "rgba(245,158,11,0.45)" : "rgba(255,255,255,0.07)"}` }}>
                <p.Icon size={12} style={{ color: active ? "#F59E0B" : "#64748B" }} />
                <span className="text-xs font-semibold" style={{ color: active ? "#F59E0B" : "#94A3B8" }}>{p.label}</span>
                <span className="text-xs" style={{ color: active ? "rgba(245,158,11,0.7)" : "#475569" }}>{p.desc}</span>
              </button>
            )
          })}
        </div>
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <RuleBar {...currentRule} height={10} />
          <div className="grid grid-cols-3 gap-3">
            {[
              { Icon: Home,      label: "Necesidades", key: "needsPct"   as const, color: "#10B981" },
              { Icon: Sparkles,  label: "Deseos",      key: "wantsPct"   as const, color: "#6366F1" },
              { Icon: PiggyBank, label: "Ahorro",      key: "savingsPct" as const, color: "#F59E0B" },
            ].map(({ Icon, label, key, color }) => {
              const pct = currentRule[key]
              const amt = income * pct / 100
              return (
                <div key={key} className="rounded-xl p-3" style={{ background: `${color}0D`, border: `1px solid ${color}22` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} style={{ color }} />
                    <span className="text-xs" style={{ color: "#94A3B8" }}>{label}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color }}>{pct}%</p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{income > 0 ? formatCurrency(amt) : "—"}</p>
                </div>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSaveRule} disabled={ruleSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#F59E0B" }}>
            <Save size={13} />{ruleSaving ? "Guardando..." : "Guardar regla"}
          </button>
          {ruleSaved && <span className="flex items-center gap-1 text-xs" style={{ color: "#10B981" }}><CheckCircle2 size={13} /> Guardado</span>}
        </div>
      </div>

      {/* FIRE Calculator */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
            <Flame size={14} style={{ color: "#EF4444" }} />
          </div>
          <h2 className="text-sm font-semibold text-white">Calculadora FIRE</h2>
          <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: "rgba(239,68,68,0.1)", color: "#F87171" }}>Financial Independence</span>
        </div>
        <div className="grid lg:grid-cols-3 gap-4 mb-5">
          {[
            { label: "Gastos mensuales",          val: monthlyExpenses, set: setMonthlyExpenses, ph: "2000"  },
            { label: "Ahorros / inversiones hoy", val: currentSavings,  set: setCurrentSavings,  ph: "10000" },
            { label: "Ahorro mensual",             val: monthlySavings,  set: setMonthlySavings,  ph: "500"   },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "#94A3B8" }}>{label}</label>
              <input type="number" className="input-dark" placeholder={`Ej: ${ph}`} value={val} onChange={(e) => set(e.target.value)} />
            </div>
          ))}
        </div>
        {expensesNum > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Número FIRE",    value: formatCurrency(fireNumber),     color: "#EF4444" },
              { label: "Gastos anuales", value: formatCurrency(expensesNum*12), color: "#F59E0B" },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-4 rounded-xl" style={{ background: `${color}0D`, border: `1px solid ${color}20` }}>
                <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "#64748B" }}>{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            ))}
            {savingsNum > 0 && (
              <div className="p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
                <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "#64748B" }}>Progreso FIRE</p>
                <p className="text-xl font-bold text-white">{formatPercent((savingsNum / fireNumber) * 100)}</p>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100,(savingsNum/fireNumber)*100)}%`, background: "#6366F1" }} />
                </div>
              </div>
            )}
            {mSavingsNum > 0 && (
              <div className="p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "#64748B" }}>Años para FIRE</p>
                <p className="text-xl font-bold text-emerald-400">{yearsToFire > 100 ? "100+" : yearsToFire}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: "#475569" }}>Ingresa tus gastos mensuales para calcular</p>
        )}
        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
          <Info size={13} className="mt-0.5 shrink-0" style={{ color: "#475569" }} />
          <p className="text-xs" style={{ color: "#64748B" }}>
            <strong className="text-white">Regla del 4%:</strong> Tu Número FIRE es 25× tus gastos anuales. Si retiras el 4% anual, el portafolio dura indefinidamente.
          </p>
        </div>
      </div>

    </div>
  )
}
