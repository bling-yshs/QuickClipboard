import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useInputFocus, focusWindowImmediately } from '@shared/hooks/useInputFocus';
/**
 * 渲染常驻搜索输入框，支持输入法和快捷键聚焦。
 * @param {Object} props 搜索值、输入回调与布局方向。
 * @param {import('react').ForwardedRef<Object>} ref 搜索框操作引用。
 * @returns {JSX.Element} 搜索输入框。
 */
const TitleBarSearch = forwardRef(({
  value,
  onChange,
  placeholder,
  isVertical = false
}, ref) => {
  const [inputValue, setInputValue] = useState(value || '');
  const inputRef = useInputFocus();
  const isComposingRef = useRef(false);

  // 搜索框清空按钮样式
  const searchInputStyle = `
        .titlebar-search input[type="search"]::-webkit-search-cancel-button {
            -webkit-appearance: none;
            appearance: none;
            height: 14px;
            width: 14px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='18' y1='6' x2='6' y2='18'%3E%3C/line%3E%3Cline x1='6' y1='6' x2='18' y2='18'%3E%3C/line%3E%3C/svg%3E");
            background-size: 14px 14px;
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.2s;
        }
        .titlebar-search input[type="search"]::-webkit-search-cancel-button:hover {
            opacity: 1;
        }
    `;

  // 同步外部搜索内容
  useEffect(() => {
    if (!isComposingRef.current) {
      setInputValue(value || '');
    }
  }, [value]);

  /**
   * 聚焦后选中现有搜索文本。
   * @returns {void}
   */
  const handleFocus = () => {
    if (inputRef.current && inputValue) {
      setTimeout(() => {
        inputRef.current.select();
      }, 100);
    }
  };
  /**
   * 同步输入内容，并在输入法组合结束后提交搜索。
   * @param {import('react').ChangeEvent<HTMLInputElement>} e 输入事件。
   * @returns {void}
   */
  const handleChange = e => {
    const nextValue = e.target.value;
    setInputValue(nextValue);

    if (e.nativeEvent?.isComposing || isComposingRef.current) {
      return;
    }

    onChange(nextValue);
  };
  /**
   * 标记输入法开始组合文本。
   * @returns {void}
   */
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };
  /**
   * 在输入法组合结束时提交搜索文本。
   * @param {import('react').CompositionEvent<HTMLInputElement>} e 输入法事件。
   * @returns {void}
   */
  const handleCompositionEnd = e => {
    const nextValue = e.currentTarget.value;
    isComposingRef.current = false;
    setInputValue(nextValue);
    onChange(nextValue);
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    /**
     * 激活窗口并聚焦搜索框。
     * @returns {Promise<void>} 聚焦完成。
     */
    focus: async () => {
      if (inputRef.current) {
        try {
          await focusWindowImmediately();
          inputRef.current.focus();
          inputRef.current.select();
        } catch (error) {
          console.error('聚焦搜索框失败:', error);
        }
      }
    },
    /**
     * 移除输入焦点，保持搜索框可见。
     * @returns {void}
     */
    blur: () => {
      inputRef.current?.blur();
    },
    /**
     * 切换输入焦点，保持搜索框可见。
     * @returns {Promise<void>} 焦点切换完成。
     */
    toggleFocus: async () => {
      if (document.activeElement === inputRef.current) {
        inputRef.current.blur();
        return;
      }

      if (inputRef.current) {
        try {
          await focusWindowImmediately();
          inputRef.current.focus();
          inputRef.current.select();
        } catch (error) {
          console.error('切换搜索框焦点失败:', error);
        }
      }
    },
    /**
     * 查询搜索框是否持有输入焦点。
     * @returns {boolean} 是否已聚焦。
     */
    isFocused: () => document.activeElement === inputRef.current
  }));
  return <>
    <style>{searchInputStyle}</style>
    <div className={`titlebar-search min-w-0 flex ${isVertical ? 'w-7 h-48 flex-shrink-0' : 'flex-1'}`}>
      <input
        ref={inputRef}
        type="search"
        value={inputValue}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onFocus={handleFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        style={isVertical ? { writingMode: 'vertical-rl', textAlign: 'start' } : undefined}
        className={`${isVertical ? 'w-7 h-full py-2' : 'h-7 w-full px-2'} min-w-0 text-sm bg-qc-panel border border-qc-border rounded-lg outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-qc-fg placeholder:text-qc-fg-subtle shadow-sm`}
      />
    </div>
  </>;
});
TitleBarSearch.displayName = 'TitleBarSearch';
export default TitleBarSearch;
