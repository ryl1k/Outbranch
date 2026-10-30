export const STORAGE_KEY = "outbranch-theme"
export const DARK_CLASS = "theme-dark"

/** Runs in <head> before first paint, only on the pages that support dark mode. */
export const THEME_BOOT_SCRIPT = `try{var p=location.pathname;if(["/projects","/settings","/showcase","/pricing"].some(function(x){return p===x||p.indexOf(x+"/")===0})&&localStorage.getItem("${STORAGE_KEY}")==="dark")document.documentElement.classList.add("${DARK_CLASS}")}catch(e){}`
