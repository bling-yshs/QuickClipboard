import { useEffect, useRef } from 'react'
import { focusClipboardWindow, restoreLastFocus } from '@shared/api'

// 全局焦点状态
let currentFocusState = 'normal'
let focusDebounceTimer = null
let blurDebounceTimer = null
const FOCUS_DEBOUNCE_DELAY = 50

// 重置状态
if (typeof window !== 'undefined') {
  /**
   * 清理当前窗口失焦前安排的焦点任务。
   * @returns {void}
   */
  window.addEventListener('blur', () => {
    clearTimeout(focusDebounceTimer)
    clearTimeout(blurDebounceTimer)
    focusDebounceTimer = null
    blurDebounceTimer = null
    currentFocusState = 'normal'
  })
}

// 防抖的焦点启用函数
async function debouncedEnableFocus() {
  if (blurDebounceTimer) {
    clearTimeout(blurDebounceTimer)
    blurDebounceTimer = null
  }

  if (currentFocusState === 'focused') {
    return
  }

  if (focusDebounceTimer) {
    clearTimeout(focusDebounceTimer)
  }
  
  focusDebounceTimer = setTimeout(async () => {
    try {
      await focusClipboardWindow()
      currentFocusState = 'focused'
    } catch (error) {
      console.error('启用窗口焦点失败:', error)
    }
    focusDebounceTimer = null
  }, FOCUS_DEBOUNCE_DELAY)
}

/**
 * 在输入结束后恢复执行条目快捷键，保持窗口内点击的焦点连续性。
 * @returns {Promise<void>} 完成延迟任务的安排。
 */
async function debouncedRestoreFocus() {
  if (focusDebounceTimer) {
    clearTimeout(focusDebounceTimer)
    focusDebounceTimer = null
  }
  
  // 如果已经是normal状态，不需要重复调用
  if (currentFocusState === 'normal') {
    return
  }

  if (blurDebounceTimer) {
    clearTimeout(blurDebounceTimer)
  }
  
  /**
   * 在输入框均已失焦时结束输入模式。
   * @returns {Promise<void>} 快捷键恢复完成时兑现。
   */
  blurDebounceTimer = setTimeout(async () => {
    blurDebounceTimer = null
    const activeElement = document.activeElement
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    )
    
    // 如果有其他输入框获得焦点，不恢复
    if (isInputFocused) {
      return
    }
    
    try {
      await restoreLastFocus(false)
      currentFocusState = 'normal'
    } catch (error) {
      console.error('恢复工具窗口模式失败:', error)
    }
    blurDebounceTimer = null
  }, FOCUS_DEBOUNCE_DELAY)
}

// 当输入框获得焦点时启用窗口焦点，失去焦点时恢复工具窗口模式
export function useInputFocus() {
  const inputRef = useRef(null)

  useEffect(() => {
    const element = inputRef.current
    if (!element) return

    const handleFocus = () => {
      debouncedEnableFocus()
    }

    const handleBlur = () => {
      debouncedRestoreFocus()
    }

    element.addEventListener('focus', handleFocus)
    element.addEventListener('blur', handleBlur)
    const checkInitialFocus = setTimeout(() => {
      if (document.activeElement === element) {
        debouncedEnableFocus()
      }
    }, 0)

    return () => {
      element.removeEventListener('focus', handleFocus)
      element.removeEventListener('blur', handleBlur)
      clearTimeout(checkInitialFocus)
    }
  }, [])

  return inputRef
}

// 立即启用窗口焦点（跳过防抖）
export async function focusWindowImmediately() {
  if (blurDebounceTimer) {
    clearTimeout(blurDebounceTimer)
    blurDebounceTimer = null
  }
  if (focusDebounceTimer) {
    clearTimeout(focusDebounceTimer)
    focusDebounceTimer = null
  }
  
  try {
    await focusClipboardWindow()
    currentFocusState = 'focused'
  } catch (error) {
    console.error('立即启用窗口焦点失败:', error)
  }
}

/**
 * 结束输入模式并保持当前窗口的前台焦点。
 * @returns {Promise<void>} 快捷键恢复完成时兑现。
 */
export async function restoreFocus() {
  clearTimeout(focusDebounceTimer)
  clearTimeout(blurDebounceTimer)
  focusDebounceTimer = null
  blurDebounceTimer = null
  try {
    await restoreLastFocus(false)
    currentFocusState = 'normal'
  } catch (error) {
    console.error('恢复焦点失败:', error)
  }
}
