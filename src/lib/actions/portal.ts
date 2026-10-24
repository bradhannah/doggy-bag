// Moves an overlay to <body> so it escapes ancestor opacity, transforms and
// stacking contexts (e.g. a modal opened from a dimmed, completed category).
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return {
    destroy() {
      node.remove();
    },
  };
}
