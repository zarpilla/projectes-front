import service from '@/service/index'
import { fiscalStartMonth } from '@/domain/years'

/**
 * The entity's fiscal year settings (Configuració general › Projectes), from
 * the cached `me`: { startMonth: 1–12, grantableFiscal: grant years are
 * fiscal years }. Calendar year when `me` can't be read.
 */
export async function loadFiscalSettings () {
  try {
    const me = (await service({ requiresAuth: true, cached: true }).get('me')).data
    return {
      startMonth: fiscalStartMonth(me),
      grantableFiscal: fiscalStartMonth(me) > 1 && !!(me && me.options && me.options.grantable_fiscal_years)
    }
  } catch (e) {
    return { startMonth: 1, grantableFiscal: false }
  }
}
