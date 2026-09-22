import { useRef, forwardRef, useImperativeHandle, useEffect, useState, useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { listen } from '@tauri-apps/api/event';
import { favoritesStore, refreshFavorites } from '@shared/store';
import { groupsStore } from '@shared/store/groupsStore';
import { settingsStore } from '@shared/store/settingsStore';
import { openBlankEditor } from '@shared/api/textEditor';
import FavoritesList from './FavoritesList';
import FloatingToolbar from './FloatingToolbar';

const SEARCH_DEBOUNCE_DELAY = 200;
/**
 * 渲染列表并同步搜索文本、正则模式和筛选条件。
 * @param {Object} props 列表筛选属性。
 * @param {Object} ref 列表操作引用。
 * @returns {JSX.Element} 列表标签页。
 */
const FavoritesTab = forwardRef(({
  contentFilter,
  pasteFilter = 'all',
  searchQuery,
  regexSearch = false
}, ref) => {
  const snap = useSnapshot(favoritesStore);
  const settings = useSnapshot(settingsStore);
  const listRef = useRef(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const prevTotalCountRef = useRef(snap.totalCount);
  const searchDebounceRef = useRef(null);

  /**
   * 延迟应用搜索文本及正则模式。
   * @param {string} query 搜索文本。
   * @param {boolean} useRegex 是否启用正则搜索。
   * @returns {void}
   */
  const debouncedSearch = useCallback((query, useRegex) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    searchDebounceRef.current = setTimeout(() => {
      favoritesStore.setFilter(query, useRegex);
      refreshFavorites();
    }, query ? SEARCH_DEBOUNCE_DELAY : 0);
  }, []);

  useEffect(() => {
    favoritesStore.setContentType(contentFilter);
    favoritesStore.setPasteStatus(pasteFilter);
    debouncedSearch(searchQuery, regexSearch);
    
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, regexSearch, contentFilter, pasteFilter, debouncedSearch]);

  useEffect(() => {
    if (snap.totalCount > prevTotalCountRef.current) {
      handleScrollToTop({ checkSetting: true, delay: 100 });
    }
    prevTotalCountRef.current = snap.totalCount;
  }, [snap.totalCount]);

  useEffect(() => {
    const setupListeners = async () => {
      const unlisten1 = await listen('window-show-animation', () => handleScrollToTop({ checkSetting: true, delay: 50 }));
      const unlisten2 = await listen('edge-snap-show', () => handleScrollToTop({ checkSetting: true, delay: 50 }));
      return () => {
        unlisten1();
        unlisten2();
      };
    };
    let cleanup = setupListeners();
    return () => cleanup.then(fn => fn());
  }, [settings.autoScrollToTopOnShow]);

  // 暴露导航方法给父组件
  useImperativeHandle(ref, () => ({
    navigateUp: () => listRef.current?.navigateUp?.(),
    navigateDown: () => listRef.current?.navigateDown?.(),
    executeCurrentItem: () => listRef.current?.executeCurrentItem?.(),
    executePlainTextPaste: () => listRef.current?.executePlainTextPaste?.()
  }));

  // 处理滚动状态变化
  const handleScrollStateChange = ({
    atTop
  }) => {
    setIsAtTop(atTop);
  };

  // 处理返回顶部
  const handleScrollToTop = (options = {}) => {
    const {
      checkSetting = true,
      delay = 0
    } = options;

    if (checkSetting && !settings.autoScrollToTopOnShow) {
      return;
    }

    setTimeout(() => {
      listRef.current?.scrollToTop?.();
      navigationStore.resetNavigation();
    }, delay);
  };

  // 处理添加收藏
  const handleAddFavorite = async () => {
    try {
      const currentGroup = groupsStore.currentGroup === '全部' ? null : groupsStore.currentGroup;
      await openBlankEditor(currentGroup);
    } catch (error) {
      console.error('打开文本编辑器失败：', error);
    }
  };

  // 判断是否显示添加收藏按钮
  const shouldShowAddFavorite = !snap.isMultiSelectMode;
  return <div className="h-full flex flex-col relative">
      <FavoritesList ref={listRef} onScrollStateChange={handleScrollStateChange} />
      
      {/* 悬浮工具栏 */}
      <FloatingToolbar showScrollTop={!isAtTop && snap.totalCount > 0} showAddFavorite={shouldShowAddFavorite} onScrollTop={() => handleScrollToTop({
      checkSetting: false
    })} onAddFavorite={handleAddFavorite} />
    </div>;
});
FavoritesTab.displayName = 'FavoritesTab';
export default FavoritesTab;
