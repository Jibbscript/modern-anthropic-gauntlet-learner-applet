import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { WidgetId } from '../core/types'
import type { WidgetProps } from './specs'

/** Widgets are code-split; each loads the first time a step uses it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WIDGETS: Record<WidgetId, LazyExoticComponent<ComponentType<WidgetProps<any>>>> = {
  race: lazy(() => import('./RaceWidget')),
  deadlock: lazy(() => import('./DeadlockWidget')),
  crawler: lazy(() => import('./CrawlerWidget')),
  lru: lazy(() => import('./LruWidget')),
  pool: lazy(() => import('./PoolWidget')),
  pipeline: lazy(() => import('./PipelineWidget')),
  sampler: lazy(() => import('./SamplerWidget')),
  dedup: lazy(() => import('./DedupWidget')),
  vm: lazy(() => import('./VmWidget')),
  tokenbucket: lazy(() => import('./TokenBucketWidget')),
  collab: lazy(() => import('./CollabWidget')),
  estimator: lazy(() => import('./EstimatorWidget')),
}
