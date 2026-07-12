// 轻量 HTML 消毒：移除脚本、事件处理器与危险协议，用于渲染 Markdown 输出。
// 注意：这是一个务实的本地防护层（非完整 DOMPurify）。若引入 dompurify 依赖，
// 应优先使用之。此实现覆盖常见 XSS 向量：<script>、on* 事件、javascript:/data: 协议。

const DANGEROUS_TAGS = ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'style', 'base', 'form']

/** 消毒 HTML 字符串，移除脚本与事件处理器等危险内容 */
export function sanitizeHtml(html: string): string {
  let out = html

  // 移除危险标签及其内容（成对）或自闭合
  for (const tag of DANGEROUS_TAGS) {
    // 成对标签含内容
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'gi'), '')
    // 残余的开合标签
    out = out.replace(new RegExp(`</?${tag}\\b[^>]*>`, 'gi'), '')
  }

  // 移除内联事件处理器 on*="..." / on*='...' / on*=value
  out = out.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
  out = out.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')

  // 中和危险协议：href/src 中的 javascript: / vbscript: / data:text/html
  out = out.replace(/(href|src|xlink:href)\s*=\s*(["'])\s*(?:javascript|vbscript):[^"']*\2/gi, '$1=$2#$2')
  out = out.replace(/(href|src|xlink:href)\s*=\s*(["'])\s*data:text\/html[^"']*\2/gi, '$1=$2#$2')

  // 移除 style 属性中的 expression() 等（保留其余样式）
  out = out.replace(/\s+style\s*=\s*"(?:[^"]*expression\s*\([^"]*)"/gi, '')

  return out
}
