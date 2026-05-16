/* GETABOUTIT shell auto-init — every game page loads this AFTER core.js */
(() => {
  function go() {
    if (!window.GAI) return;
    window.GAI.shell.init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go);
  } else {
    go();
  }
})();
