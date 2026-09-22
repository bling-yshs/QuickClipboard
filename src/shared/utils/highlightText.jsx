/**
 * 高亮普通关键词或正则实际匹配的文本。
 * @param {string} text 待显示的文本。
 * @param {string} keyword 搜索关键词或正则模式。
 * @param {boolean} regexSearch 是否按正则匹配。
 * @returns {string|Array<import('react').ReactNode>} 包含高亮标记的文本。
 */
export function highlightText(text, keyword, regexSearch = false) {
  if (!keyword || !text) return text;

  const regex = createSearchMatcher(keyword, regexSearch);
  if (!regex) return text;

  const parts = [];
  let offset = 0;
  for (const match of text.matchAll(regex)) {
    if (!match[0].length) continue;
    parts.push(text.slice(offset, match.index));
    parts.push(
      <mark
        key={match.index}
        className="search-highlight bg-[var(--qc-search-highlight-bg)] text-[var(--qc-search-highlight-fg)] rounded-sm px-0.5"
        data-highlight="true"
      >
        {match[0]}
      </mark>
    );
    offset = match.index + match[0].length;
  }
  if (!parts.length) return text;
  parts.push(text.slice(offset));
  return parts;
}

/**
 * 创建供文本和 HTML 高亮共用的搜索表达式。
 * @param {string} keyword 搜索文本。
 * @param {boolean} regexSearch 是否使用正则模式。
 * @returns {RegExp|null} 匹配表达式，空输入或无效模式返回 null。
 */
function createSearchMatcher(keyword, regexSearch) {
  if (regexSearch) {
    let pattern = keyword;
    let flags = 'gu';
    const inlineFlags = pattern.match(/^\(\?([ims]+)\)/);
    if (inlineFlags) {
      flags += [...new Set(inlineFlags[1])].join('');
      pattern = pattern.slice(inlineFlags[0].length);
    }
    try {
      return new RegExp(pattern, flags);
    } catch {
      return null;
    }
  }

  const keywords = keyword.trim().split(/\s+/).filter(Boolean);
  if (!keywords.length) return null;
  const escapedKeywords = [...new Set(keywords.map((item) => item.toLowerCase()))]
    .sort((a, b) => b.length - a.length)
    .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(escapedKeywords.join('|'), 'gi');
}

/**
 * 在 HTML 文本节点中标记搜索匹配片段。
 * @param {HTMLElement} container 富文本容器。
 * @param {string} keyword 搜索关键词或正则模式。
 * @param {boolean} regexSearch 是否使用正则匹配。
 * @returns {void}
 */
export function highlightHtmlContent(container, keyword, regexSearch = false) {
  if (!container) return;
  clearHighlights(container);
  if (!keyword) return;

  const regex = createSearchMatcher(keyword, regexSearch);
  if (!regex) return;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  for (const textNode of textNodes) {
    const text = textNode.nodeValue;
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const match of text.matchAll(regex)) {
      if (!match[0].length) continue;
      fragment.appendChild(document.createTextNode(text.slice(offset, match.index)));
      const mark = document.createElement('mark');
      mark.className =
        'search-highlight bg-[var(--qc-search-highlight-bg)] text-[var(--qc-search-highlight-fg)] rounded-sm px-0.5';
      mark.setAttribute('data-highlight', 'true');
      mark.textContent = match[0];
      fragment.appendChild(mark);
      offset = match.index + match[0].length;
    }
    if (offset > 0) {
      fragment.appendChild(document.createTextNode(text.slice(offset)));
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  }
}

// 清除容器中的高亮
export function clearHighlights(container) {
  if (!container) return;

  const marks = container.querySelectorAll('mark[data-highlight="true"]');
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    const text = document.createTextNode(mark.textContent);
    parent.replaceChild(text, mark);
    parent.normalize();
  });
}

// 在容器内部滚动到第一个高亮元素
export function scrollToFirstHighlight(container) {
  if (!container) return false;

  const firstHighlight = container.querySelector('mark[data-highlight="true"]');
  if (!firstHighlight) return false;

  const containerRect = container.getBoundingClientRect();
  const highlightRect = firstHighlight.getBoundingClientRect();

  const highlightTop = highlightRect.top - containerRect.top + container.scrollTop;

  const isVisible =
    highlightRect.top >= containerRect.top &&
    highlightRect.bottom <= containerRect.bottom;

  if (!isVisible) {
    const scrollTarget = highlightTop - container.clientHeight / 2 + highlightRect.height / 2;
    container.scrollTop = Math.max(0, scrollTarget);
  }

  return true;
}
