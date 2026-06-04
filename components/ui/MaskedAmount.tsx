"use client"

import { usePrivacy } from "@/components/providers/PrivacyProvider"
import { formatCurrency } from "@/lib/utils"

interface MaskedAmountProps {
  amount: number
  className?: string
  currency?: string
}

export default function MaskedAmount({ amount, className, currency }: MaskedAmountProps) {
  const { isPrivate } = usePrivacy()

  if (isPrivate) {
    return <span className={className}>•••••</span>
  }

  return (
    <span className={className}>
      {formatCurrency(amount, currency)}
    </span>
  )
}
