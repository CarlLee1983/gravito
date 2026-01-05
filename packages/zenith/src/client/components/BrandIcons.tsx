import type { SVGProps } from 'react'

export function NodeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Node.js"
      {...props}
    >
      <path
        d="M16 2L2.1 9.9v12.2L16 30l13.9-7.9V9.9L16 2zm11.9 19.1L16 27.8l-11.9-6.7V11.1L16 4.2l11.9 6.9v10z"
        fill="#339933"
      />
      <path d="M16 22.5l-6-3.4v-6.8l6-3.4 6 3.4v6.8l-6 3.4z" fill="#339933" />
    </svg>
  )
}

export function BunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Bun"
      {...props}
    >
      {/* Outer Outline/Shadow for contrast on light bg */}
      <path
        d="M30 17.045a9.8 9.8 0 0 0-.32-2.306l-.004.034a11.2 11.2 0 0 0-5.762-6.786c-3.495-1.89-5.243-3.326-6.8-3.811h.003c-1.95-.695-3.949.82-5.825 1.927-4.52 2.481-9.573 5.45-9.28 11.417.008-.029.017-.052.026-.08a9.97 9.97 0 0 0 3.934 7.257l-.01-.006C13.747 31.473 30.05 27.292 30 17.045"
        fill="#fbf0df"
        stroke="#4a4a4a"
        strokeWidth="1.5"
      />

      <path
        fill="#37474f"
        d="M19.855 20.236A.8.8 0 0 0 19.26 20h-6.514a.8.8 0 0 0-.596.236.51.51 0 0 0-.137.463 4.37 4.37 0 0 0 1.641 2.339 4.2 4.2 0 0 0 2.349.926 4.2 4.2 0 0 0 2.343-.926 4.37 4.37 0 0 0 1.642-2.339.5.5 0 0 0-.132-.463Z"
      />
      <ellipse cx="22.5" cy="18.5" fill="#f8bbd0" rx="2.5" ry="1.5" />
      <ellipse cx="9.5" cy="18.5" fill="#f8bbd0" rx="2.5" ry="1.5" />
      <circle cx="10" cy="16" r="2" fill="#37474f" />
      <circle cx="22" cy="16" r="2" fill="#37474f" />
    </svg>
  )
}

export function DenoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Deno"
      {...props}
    >
      <circle cx="16" cy="16" r="14" fill="currentColor" />
      <path
        d="M16 6C16 6 24 10 24 18C24 23.5228 19.5228 28 14 28C8.47715 28 4 23.5228 4 18C4 10 16 6 16 6Z"
        fill="white"
      />
      <circle cx="12" cy="18" r="2" fill="black" />
    </svg>
  )
}

export function PhpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="PHP"
      {...props}
    >
      <ellipse cx="16" cy="16" rx="14" ry="10" fill="#777BB4" />
      <text
        x="50%"
        y="54%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="white"
        fontSize="9"
        fontWeight="bold"
      >
        PHP
      </text>
    </svg>
  )
}

export function GoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Go"
      {...props}
    >
      <path
        d="M5 16C5 10 10 5 16 5H24V13H16C14.3431 13 13 14.3431 13 16C13 17.6569 14.3431 19 16 19H27V27H16C10 27 5 22 5 16Z"
        fill="#00ADD8"
      />
      <circle cx="9" cy="16" r="2" fill="white" />
      <circle cx="23" cy="9" r="2" fill="white" />
    </svg>
  )
}

export function PythonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Python"
      {...props}
    >
      <path
        d="M16 2C10 2 10 5 10 5L10 9L18 9L18 11L8 11L8 20L12 20L12 14L22 14C22 14 22 12 16 2Z"
        fill="#3776AB"
      />
      <path
        d="M16 30C22 30 22 27 22 27L22 23L14 23L14 21L24 21L24 12L20 12L20 18L10 18C10 18 10 20 16 30Z"
        fill="#FFD43B"
      />
    </svg>
  )
}
