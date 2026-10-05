import type { Lab } from '../../core/types'
import kvStore from './kv-store'
import lruCache from './lru-cache'
import stackEvents from './stack-events'
import fileDedup from './file-dedup'
import webCrawler from './web-crawler'
import stackVm from './stack-vm'
import imageOps from './image-ops'

/** Code labs in display order. */
export const LABS: Lab[] = [kvStore, lruCache, stackEvents, fileDedup, webCrawler, stackVm, imageOps].filter((l) => l.levels.length > 0)
export const ALL_LABS: Lab[] = [kvStore, lruCache, stackEvents, fileDedup, webCrawler, stackVm, imageOps]
