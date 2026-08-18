export function copyStylesToWindow(pipWindow) {
  [...document.styleSheets].forEach((styleSheet) => {
    try {
      const cssText = [...styleSheet.cssRules].map((rule) => rule.cssText).join('\n');
      const style = pipWindow.document.createElement('style');
      style.textContent = cssText;
      pipWindow.document.head.appendChild(style);
    } catch {
      // Cross-origin stylesheets (e.g. a CDN font) block reading cssRules —
      // link it instead of inlining it.
      if (styleSheet.href) {
        const link = pipWindow.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = styleSheet.href;
        if (styleSheet.media) link.media = styleSheet.media;
        pipWindow.document.head.appendChild(link);
      }
    }
  });
}

export function watchForNewStyles(pipWindow) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.tagName === 'STYLE') {
          const clone = pipWindow.document.createElement('style');
          clone.textContent = node.textContent;
          pipWindow.document.head.appendChild(clone);
        }
      });
    });
  });
  observer.observe(document.head, { childList: true });
  return () => observer.disconnect();
}