// Only the topmost modal owns keyboard focus and Escape.
const dialogs: HTMLElement[] = [];
let nextId = 0;

export function dialogTitleId(): string {
  return `dialog-title-${++nextId}`;
}

export function modalFocus(node: HTMLElement, onClose: () => void) {
  const previousFocus = document.activeElement as HTMLElement | null;
  dialogs.push(node);
  const focusable = () =>
    Array.from(
      node.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'
      )
    ).filter((element) => !element.closest('[hidden], [inert]'));

  function focusInitial() {
    (node.querySelector<HTMLElement>('[data-initial-focus]') ?? focusable()[0] ?? node).focus();
  }

  function handleFocus(event: FocusEvent) {
    if (dialogs.at(-1) === node && !node.contains(event.target as Node)) focusInitial();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (dialogs.at(-1) !== node) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    } else if (event.key === 'Tab') {
      const elements = focusable();
      const first = elements[0] ?? node;
      const last = elements.at(-1) ?? node;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === node)
      ) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  document.addEventListener('keydown', handleKeydown, true);
  document.addEventListener('focusin', handleFocus);
  queueMicrotask(() => {
    if (node.isConnected && dialogs.at(-1) === node) focusInitial();
  });
  return {
    update(callback: () => void) {
      onClose = callback;
    },
    destroy() {
      dialogs.splice(dialogs.indexOf(node), 1);
      document.removeEventListener('keydown', handleKeydown, true);
      document.removeEventListener('focusin', handleFocus);
      if (previousFocus?.isConnected) previousFocus.focus();
    },
  };
}
