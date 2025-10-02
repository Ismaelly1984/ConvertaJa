import React from 'react'

export const MergeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M7 3v6c0 2.8 2.2 5 5 5h5"/>
    <path d="M7 21V3"/>
    <path d="M16 7l3 3-3 3"/>
  </svg>
)

export const SplitIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M7 5l5 5-5 5"/>
    <path d="M17 5l-5 5 5 5"/>
  </svg>
)

export const CompressIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M8 3h8"/>
    <path d="M12 7v10"/>
    <path d="M9 10l3-3 3 3"/>
    <path d="M9 14l3 3 3-3"/>
  </svg>
)

export const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="M21 17l-5-5-4 4-2-2-7 7"/>
  </svg>
)

export const OcrIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M4 4h5v2H6v3H4V4zM20 4h-5v2h3v3h2V4zM4 20h5v-2H6v-3H4v5zM20 20h-5v-2h3v-3h2v5z"/>
    <path d="M9 15c0-2.2 1.8-4 4-4 1.5 0 2.8.8 3.4 2"/>
    <path d="M16 15c0 2.2-1.8 4-4 4-1.5 0-2.8-.8-3.4-2"/>
  </svg>
)

