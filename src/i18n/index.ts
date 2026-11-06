import { useCallback } from 'react'
import { useSettings } from '@/store/settingsStore'
import type { Language } from '@/store/types'
import { ar } from './ar'
import { en, type TranslationKey } from './en'

export type { TranslationKey }

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, ar }

export type TFunction = (key: TranslationKey, vars?: Record<string, string | number>) => string

export function translate(lang: Language, key: TranslationKey, vars?: Record<string, string | number>): string {
  let text = dictionaries[lang][key] ?? en[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v))
  return text
}

/** Translation hook bound to the current language. */
export function useT(): TFunction {
  const lang = useSettings((s) => s.language)
  return useCallback<TFunction>((key, vars) => translate(lang, key, vars), [lang])
}

export function isTranslationKey(key: string): key is TranslationKey {
  return key in en
}
