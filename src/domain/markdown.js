import { escapeHtml, sanitizeHtml } from '@/helpers/safeHtml'

// A small Markdown for task descriptions and comments: **bold**, *italic*,
// [links](https://…), bare links, "- " and "1. " lists, and paragraphs. The text is
// escaped first, so nobody can inject HTML; the result still goes through
// sanitizeHtml.

const inline = text =>
  text
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')

export function renderMarkdown (source) {
  const lines = escapeHtml(source || '').split(/\r?\n/)
  const out = []
  let list = null
  let para = []
  const flushPara = () => {
    if (para.length) out.push('<p>' + para.map(inline).join('<br>') + '</p>')
    para = []
  }
  const flushList = () => {
    if (list) out.push(`<${list.tag}>` + list.items.map(i => '<li>' + inline(i) + '</li>').join('') + `</${list.tag}>`)
    list = null
  }
  for (const line of lines) {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (bullet || numbered) {
      flushPara()
      const tag = bullet ? 'ul' : 'ol'
      if (!list || list.tag !== tag) {
        flushList()
        list = { tag, items: [] }
      }
      list.items.push((bullet || numbered)[1])
    } else if (!line.trim()) {
      flushPara()
      flushList()
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()
  return sanitizeHtml(out.join(''))
}

/** Plain text of a description, for a one-line preview. */
export const markdownToText = source =>
  String(source || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*`]/g, '')
    .replace(/^\s*([-*]|\d+[.)])\s+/gm, '')
