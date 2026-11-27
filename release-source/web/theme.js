/* Select the palette before the first paint. System mode tracks OS changes through CSS. */
(() => {
  'use strict';
  const key = 'cincog-experiments.theme';
  const palette = document.getElementById('dark-palette');
  const systemMedia = palette.media;

  function apply(preference) {
    if (preference === 'dark') palette.media = 'screen';
    else if (preference === 'light') palette.media = 'not all';
    else palette.media = systemMedia;
  }

  let preference = 'system';
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'dark' || saved === 'light') preference = saved;
  } catch {
    // Storage can be unavailable when opening the offline site.
  }
  apply(preference);

  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('theme');
    select.value = preference;
    document.getElementById('theme-control').hidden = false;
    select.addEventListener('change', () => {
      apply(select.value);
      try {
        if (select.value === 'system') localStorage.removeItem(key);
        else localStorage.setItem(key, select.value);
      } catch {
        // The selection still applies for this visit.
      }
    });
  });
})();
