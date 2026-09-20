const MODIFIERS = { Ctrl: 'Control', Alt: 'Alt', Shift: 'Shift', Win: 'Meta' };

/**
 * 在主窗口中监听预览快捷键，单修饰键仅在独立按下并松开后触发。
 * @param {EventTarget} target 主窗口事件目标。
 * @param {string} shortcut 快捷键配置，空字符串表示禁用。
 * @param {Function} onToggle 切换预览的回调。
 * @returns {{cancel: Function, dispose: Function}} 取消当前按键及移除监听的方法。
 */
export function bindPreviewShortcut(target, shortcut, onToggle) {
  const parts = (shortcut || '').split('+').filter(Boolean);
  const modifierKey = parts.length === 1 ? MODIFIERS[parts[0]] : null;
  let candidate = false;
  const pressed = new Set();

  /** 取消当前单键候选。 @returns {void} */
  const cancel = () => { candidate = false; };

  /** 清除失焦前的按键状态。 @returns {void} */
  const reset = () => { cancel(); pressed.clear(); };

  /**
   * 记录单键候选或处理完整组合键。
   * @param {KeyboardEvent} event 键盘事件。
   * @returns {void}
   */
  const keydown = event => {
    pressed.add(event.code || event.key);
    if (event.repeat) return;
    if (!parts.length || event.isComposing || event.defaultPrevented) {
      cancel();
      return;
    }
    const modifiersMatch = event.ctrlKey === parts.includes('Ctrl')
      && event.altKey === parts.includes('Alt')
      && event.shiftKey === parts.includes('Shift')
      && event.metaKey === parts.includes('Win');
    if (modifierKey) {
      candidate = event.key === modifierKey && modifiersMatch && pressed.size === 1;
      return;
    }
    const mainKey = parts.at(-1);
    const key = event.code?.replace(/^Key|^Digit/, '') || event.key;
    if (modifiersMatch && (key === mainKey || event.key === mainKey)) {
      event.preventDefault();
      onToggle();
    }
  };

  /**
   * 在单修饰键松开时执行一次切换。
   * @param {KeyboardEvent} event 键盘事件。
   * @returns {void}
   */
  const keyup = event => {
    const toggle = candidate && event.key === modifierKey && !event.isComposing;
    pressed.delete(event.code || event.key);
    cancel();
    if (toggle) onToggle();
  };

  target.addEventListener('keydown', keydown);
  target.addEventListener('keyup', keyup);
  target.addEventListener('blur', reset);
  target.addEventListener('pointerdown', cancel, true);
  target.addEventListener('wheel', cancel, true);

  /** 移除主窗口快捷键监听。 @returns {void} */
  const dispose = () => {
    target.removeEventListener('keydown', keydown);
    target.removeEventListener('keyup', keyup);
    target.removeEventListener('blur', reset);
    target.removeEventListener('pointerdown', cancel, true);
    target.removeEventListener('wheel', cancel, true);
  };
  return { cancel, dispose };
}
