/** Outbranch symbol geometry (64×64): one origin, three rounded growth paths and a stem. */
export const LOGO_PETALS = [
  "M23.57 35.82 Q38.94 27.94 49.23 21.05 A8 8 0 1 0 38.77 8.95 Q33.18 23.7 20.43 32.18 Z",
  "M22.16 36.39 Q38.88 36.87 52.57 40.48 A8.5 8.5 0 1 0 51.43 23.52 Q38.26 30.93 21.84 31.61 Z",
  "M20.49 35.87 Q32.84 43.06 38.28 56.83 A7.5 7.5 0 1 0 47.72 45.17 Q38.03 38.98 23.51 32.13 Z",
] as const

export const LOGO_STEM =
  "M19.52 32.31 Q16.52 46 6.03 50.97 A3.6 3.6 0 1 0 11.97 55.03 Q19.79 47.42 24.48 35.69 Z"

export const LOGO_ORIGIN = { cx: 22, cy: 34, r: 4.6 } as const
