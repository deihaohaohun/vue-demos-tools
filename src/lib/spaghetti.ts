if (
  localStorage.theme === 'dark' ||
  (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  // tailwindcss dark mode
  document.documentElement.classList.toggle('dark')
} else {
  document.documentElement.classList.toggle('light')
}
