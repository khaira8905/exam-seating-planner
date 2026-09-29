// Applies the saved (or system) theme before the page paints, to avoid a flash of the wrong theme.
try {
  const t = localStorage.getItem('seatwise-theme')
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark')
} catch {
  /* storage blocked — fall back to light */
}
