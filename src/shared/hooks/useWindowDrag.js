import { useEffect, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { startCustomDrag } from '@shared/api'

/**
 * 为标题栏绑定保持当前窗口焦点的拖拽行为。
 * @param {Object} options 拖拽区域配置。
 * @param {string[]} [options.excludeSelectors=[]] 排除拖拽的元素选择器。
 * @param {boolean} [options.allowChildren=false] 是否允许从子元素开始拖拽。
 * @returns {import('react').MutableRefObject<HTMLElement|null>} 拖拽区域引用。
 */
export function useWindowDrag(options = {}) {
  const { excludeSelectors = [], allowChildren = false } = options
  const elementRef = useRef(null)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const unlistenPromise = getCurrentWindow().listen('drag-ended', () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      isDraggingRef.current = false
    })

    /**
     * 在有效区域内按下左键时立即启动窗口拖拽。
     * @param {MouseEvent} e 鼠标按下事件。
     * @returns {void}
     */
    const handleMouseDown = (e) => {
      if (!allowChildren && e.target !== element) {
        return
      }

      for (const selector of excludeSelectors) {
        if (e.target.closest(selector)) {
          return
        }
      }

      if (e.buttons !== 1) {
        return
      }

      e.preventDefault()
      startDrag(e)
    }

    /**
     * 请求后端拖动当前窗口，并在启动失败时恢复界面状态。
     * @param {MouseEvent} initialEvent 起始鼠标事件。
     * @returns {Promise<void>} 拖拽启动请求处理完成时兑现。
     */
    const startDrag = async (initialEvent) => {
      if (isDraggingRef.current) return
      isDraggingRef.current = true

      try {
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'move'

        await startCustomDrag(initialEvent.screenX, initialEvent.screenY)
      } catch (error) {
        console.error('启动拖拽失败:', error)
        isDraggingRef.current = false
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    }

    element.addEventListener('mousedown', handleMouseDown)

    return () => {
      element.removeEventListener('mousedown', handleMouseDown)
      unlistenPromise.then(unlisten => unlisten())
    }
  }, [excludeSelectors, allowChildren])

  return elementRef
}
