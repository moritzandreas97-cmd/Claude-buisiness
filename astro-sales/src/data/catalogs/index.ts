import type { CatalogDefinition } from '../../engine/catalog/types'
import { RELIFE_TEST_CATALOG } from './relife'

/** Kataloge, die beim ersten Start einmalig als Testdaten angelegt werden. */
export const BUILT_IN_CATALOGS: CatalogDefinition[] = [RELIFE_TEST_CATALOG]
