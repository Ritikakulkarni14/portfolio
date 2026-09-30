/**
 * Runs synchronously in <head> so the correct theme is painted on the first
 * frame. Kept as a separate file because the site's CSP forbids inline script.
 */
(function () {
  var STORAGE_KEY = "sr-theme";
  var stored = null;

  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    /* Private mode or blocked storage: fall back to the system preference. */
  }

  var theme = stored === "light" || stored === "dark" ? stored : null;

  if (!theme) {
    theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  document.documentElement.dataset.theme = theme;
})();
