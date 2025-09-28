import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isVipMember(memberType?: string | null) {
  return (memberType ?? '').toLowerCase() === 'vip'
}
