// Inline script that runs before paint to apply the saved theme.
// Avoids the white flash when loading dark mode on a fresh request.
export function ThemeScript() {
  const code = `
    (function() {
      try {
        var stored = localStorage.getItem('hd-theme');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = stored || (prefersDark ? 'dark' : 'light');
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        }
        document.documentElement.style.colorScheme = theme;
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
