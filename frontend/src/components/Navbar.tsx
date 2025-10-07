import React from 'react'
import { useI18n } from '../i18n/I18nProvider'

type Props = { variant?: 'default' | 'onGradient' }

export default function Navbar({ variant = 'default' }: Props) {
  const { locale, setLocale } = useI18n()
  const onGradient = variant === 'onGradient'
  const navClass = onGradient
    ? 'sticky top-0 z-50 w-full bg-transparent text-white'
    : 'sticky top-0 z-50 w-full backdrop-blur bg-white/70 border-b border-slate-200/60'

  const brandTextClass = onGradient ? 'font-semibold text-white tracking-tight group-hover:opacity-90' : 'font-semibold text-slate-900 tracking-tight group-hover:opacity-90'
  const langBtnClass = (active: boolean) => onGradient
    ? `${active ? 'bg-white/20 text-white' : 'bg-transparent text-white border border-white/40'} px-2.5 py-1.5 rounded-md text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/30`
    : `${active ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 border'} px-2.5 py-1.5 rounded-md text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-slate-900/30`
  const loginBtnClass = onGradient
    ? 'px-3 py-1.5 rounded-md bg-white/20 text-white font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 shadow'
    : 'px-3 py-1.5 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/40 shadow'

  return (
    <nav className={navClass}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 group" aria-label={locale === 'pt' ? 'Início do ConvertaJá' : 'ConvertaJá Home'}>
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-brandIndigo to-brandViolet shadow" />
          <span className={brandTextClass}>ConvertaJá</span>
        </a>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" role="group" aria-label={locale === 'pt' ? 'Selecionar idioma' : 'Select language'}>
            <button onClick={() => setLocale('pt')} className={langBtnClass(locale === 'pt')}>PT</button>
            <button onClick={() => setLocale('en')} className={langBtnClass(locale === 'en')}>EN</button>
          </div>
          <button className={loginBtnClass}>{locale === 'pt' ? 'Entrar' : 'Login'}</button>
        </div>
      </div>
    </nav>
  )
}
