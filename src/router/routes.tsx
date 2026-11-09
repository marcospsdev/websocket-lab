import type { ReactNode } from 'react'
import { Dashboard } from '@/pages/Dashboard'
import { TradeFeed } from '@/pages/TradeFeed'
import { Klines } from '@/pages/Klines'
import { Echo } from '@/pages/Echo'

/**
 * Flat array of route definitions — a common pattern in REST apps
 * (route files exporting an array of `{path, element, title}`, consumed by a single
 * router builder). `title`, when present, also drives the nav links in `AppLayout`.
 */
export type AppRoute = {
  path: string
  element: ReactNode
  title?: string
}

export const routes: AppRoute[] = [
  { path: '/', element: <Dashboard />, title: 'Dashboard' },
  { path: '/trades', element: <TradeFeed />, title: 'Trade feed' },
  { path: '/klines', element: <Klines />, title: 'Klines' },
  { path: '/echo', element: <Echo />, title: 'Echo lab' },
]
