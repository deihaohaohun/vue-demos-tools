if (
  localStorage.theme === 'dark' ||
  (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  // tailwindcss dark mode
  document.documentElement.classList.toggle('dark')
  // tdesign dark mode
  document.documentElement.setAttribute('theme-mode', 'dark')
} else {
  document.documentElement.classList.toggle('light')
  document.documentElement.setAttribute('theme-mode', 'light')
}
