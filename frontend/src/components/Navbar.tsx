import React from 'react'
import { useI18n } from '../i18n/I18nProvider'
import '../styles/nav.css'

type Props = { variant?: 'default' | 'onGradient' }

export default function Navbar({ variant = 'default' }: Props) {
  const { locale, setLocale } = useI18n()
  const onGradient = variant === 'onGradient'
  const navClass = onGradient ? 'nav nav--gradient' : 'nav nav--default'
  const brandTextClass = onGradient ? 'nav__brandText nav__brandText--gradient' : 'nav__brandText nav__brandText--default'
  const logoSrc = `${import.meta.env.BASE_URL}icons/converta-ja-logo-icon.svg`
  const langBtnClass = (active: boolean) => {
    if (onGradient) return `nav__langBtn ${active ? 'nav__langBtn--gradient-active' : 'nav__langBtn--gradient'}`
    return `nav__langBtn ${active ? 'nav__langBtn--default-active' : 'nav__langBtn--default'}`
  }
  const loginBtnClass = onGradient ? 'nav__loginBtn nav__loginBtn--gradient' : 'nav__loginBtn nav__loginBtn--default'

  return (
    <nav className={navClass}>
      <div className="nav__container">
        <a href="#" className="flex items-center gap-2 group" aria-label={locale === 'pt' ? 'Início do ConvertaJá' : 'ConvertaJá Home'}>
          <img src={logoSrc} alt="" aria-hidden="true" className="nav__brandLogo" />
          <span className={brandTextClass}>ConvertaJá</span>
        </a>
        <div className="flex items-center gap-3">
          <div className="nav__langGroup" role="group" aria-label={locale === 'pt' ? 'Selecionar idioma' : 'Select language'}>
            <button onClick={() => setLocale('pt')} aria-pressed={locale === 'pt'} className={langBtnClass(locale === 'pt')}>PT</button>
            <button onClick={() => setLocale('en')} aria-pressed={locale === 'en'} className={langBtnClass(locale === 'en')}>EN</button>
          </div>
          <button className={loginBtnClass}>{locale === 'pt' ? 'Entrar' : 'Login'}</button>
        </div>
      </div>
    </nav>
  )
}
