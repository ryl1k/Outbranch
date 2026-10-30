/**
 * Outbranch symbol geometry, fitted point-by-point to the brand reference.
 * One origin on the left; two thick rounded arms branch up and down to the right,
 * and a lighter teardrop grows between them.
 */
export const LOGO_VIEWBOX = "1 2 101 81"
export const LOGO_STROKE = 14.8

/** Upper arm: a rounded base that runs flat, then rises steeply to the right. */
export const LOGO_UPPER = "M 9.6 45.4 C 33 45, 55 37, 77.8 11.1"

/** Lower arm: starts beneath the base and bends down to the right. */
export const LOGO_LOWER = "M 30 46.5 C 45 48, 62 58, 77.8 74.1"

/** Middle teardrop: narrow at the junction, round at the tip, tilted slightly up. */
export const LOGO_PETAL = "M 44 44 C 60 43, 76 34.5, 92.6 34.3 A 8.3 8.3 0 0 1 92.6 50.9 C 76 50.9, 60 47.5, 44 46.6 Z"
