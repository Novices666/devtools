import DOMPurify from 'dompurify'

const MARKDOWN_TAGS = [
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'input',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
]

const MARKDOWN_ATTRIBUTES = [
  'alt',
  'checked',
  'class',
  'data-lang',
  'disabled',
  'href',
  'src',
  'start',
  'title',
  'type',
]

/** 使用明确的 Markdown 白名单消毒 HTML，供 dangerouslySetInnerHTML 渲染。 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: MARKDOWN_TAGS,
    ALLOWED_ATTR: MARKDOWN_ATTRIBUTES,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
}
