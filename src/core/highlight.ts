// 轻量代码语法高亮（零依赖）。
// 面向 Markdown 代码块预览：对常见语言做词法着色，输出带 class 的 HTML span。
// 不追求完整语法树，只覆盖注释/字符串/数字/关键字/函数等常见 token，保证离线、可控、体积小。

export type HighlightLang =
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'sql'
  | 'python'
  | 'go'
  | 'java'
  | 'bash'
  | 'html'
  | 'css'
  | 'yaml'
  | 'plaintext'

/** 语言别名归一 */
const LANG_ALIASES: Record<string, HighlightLang> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  typescript: 'typescript',
  json: 'json',
  json5: 'json',
  sql: 'sql',
  mysql: 'sql',
  postgresql: 'sql',
  psql: 'sql',
  py: 'python',
  python: 'python',
  go: 'go',
  golang: 'go',
  java: 'java',
  kotlin: 'java',
  kt: 'java',
  sh: 'bash',
  bash: 'bash',
  shell: 'bash',
  zsh: 'bash',
  html: 'html',
  xml: 'html',
  css: 'css',
  scss: 'css',
  yaml: 'yaml',
  yml: 'yaml',
}

export function normalizeLang(lang: string | undefined): HighlightLang {
  if (!lang) return 'plaintext'
  return LANG_ALIASES[lang.trim().toLowerCase()] ?? 'plaintext'
}

const KEYWORDS: Partial<Record<HighlightLang, string[]>> = {
  javascript: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
    'case', 'break', 'continue', 'new', 'class', 'extends', 'super', 'this', 'typeof', 'instanceof',
    'in', 'of', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'yield', 'import', 'export',
    'from', 'default', 'null', 'undefined', 'true', 'false', 'void', 'delete', 'static', 'get', 'set',
  ],
  typescript: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
    'case', 'break', 'continue', 'new', 'class', 'extends', 'super', 'this', 'typeof', 'instanceof',
    'in', 'of', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'yield', 'import', 'export',
    'from', 'default', 'null', 'undefined', 'true', 'false', 'void', 'delete', 'static', 'get', 'set',
    'interface', 'type', 'enum', 'namespace', 'implements', 'private', 'public', 'protected', 'readonly',
    'abstract', 'as', 'is', 'keyof', 'infer', 'declare', 'never', 'unknown', 'any', 'string', 'number', 'boolean',
  ],
  python: [
    'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'class', 'import',
    'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'yield', 'global', 'nonlocal',
    'pass', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False', 'async', 'await', 'del', 'assert',
  ],
  go: [
    'func', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'break', 'continue',
    'package', 'import', 'type', 'struct', 'interface', 'map', 'chan', 'go', 'defer', 'select', 'const',
    'var', 'nil', 'true', 'false', 'string', 'int', 'int64', 'float64', 'bool', 'byte', 'rune', 'error',
  ],
  java: [
    'public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'return', 'if',
    'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'super', 'static',
    'final', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'try', 'catch',
    'finally', 'throw', 'throws', 'import', 'package', 'null', 'true', 'false', 'abstract', 'enum',
    'val', 'var', 'fun', 'data', 'object', 'when',
  ],
  sql: [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'DELETE', 'JOIN', 'LEFT', 'RIGHT', 'INNER',
    'OUTER', 'FULL', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'VALUES', 'SET', 'AND',
    'OR', 'NOT', 'NULL', 'AS', 'IN', 'LIKE', 'BETWEEN', 'IS', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'UNION',
    'ALL', 'DISTINCT', 'COUNT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'PRIMARY', 'KEY',
  ],
  bash: [
    'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function',
    'return', 'echo', 'export', 'local', 'read', 'cd', 'exit', 'source', 'in',
  ],
  yaml: [],
  css: [],
  html: [],
  json: [],
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

interface Rule {
  type: string
  re: RegExp
}

// 各语言按优先级排列的词法规则；正则均为 sticky（y），从当前位置尝试匹配。
function rulesFor(lang: HighlightLang): Rule[] {
  const common: Rule[] = []
  const cLike: Rule[] = [
    { type: 'comment', re: /\/\/[^\n]*/y },
    { type: 'comment', re: /\/\*[\s\S]*?\*\//y },
    { type: 'string', re: /"(?:\\.|[^"\\])*"/y },
    { type: 'string', re: /'(?:\\.|[^'\\])*'/y },
    { type: 'string', re: /`(?:\\.|[^`\\])*`/y },
    { type: 'number', re: /\b0[xX][0-9a-fA-F]+\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y },
    { type: 'function', re: /[A-Za-z_$][\w$]*(?=\s*\()/y },
    { type: 'ident', re: /[A-Za-z_$][\w$]*/y },
  ]
  switch (lang) {
    case 'javascript':
    case 'typescript':
    case 'go':
    case 'java':
      return cLike
    case 'python':
      return [
        { type: 'comment', re: /#[^\n]*/y },
        { type: 'string', re: /"""[\s\S]*?"""/y },
        { type: 'string', re: /'''[\s\S]*?'''/y },
        { type: 'string', re: /"(?:\\.|[^"\\])*"/y },
        { type: 'string', re: /'(?:\\.|[^'\\])*'/y },
        { type: 'number', re: /\b\d+(?:\.\d+)?\b/y },
        { type: 'function', re: /[A-Za-z_]\w*(?=\s*\()/y },
        { type: 'ident', re: /[A-Za-z_]\w*/y },
      ]
    case 'sql':
      return [
        { type: 'comment', re: /--[^\n]*/y },
        { type: 'comment', re: /\/\*[\s\S]*?\*\//y },
        { type: 'string', re: /'(?:\\.|[^'\\]|'')*'/y },
        { type: 'string', re: /"(?:\\.|[^"\\])*"/y },
        { type: 'number', re: /\b\d+(?:\.\d+)?\b/y },
        { type: 'ident', re: /[A-Za-z_]\w*/y },
      ]
    case 'bash':
      return [
        { type: 'comment', re: /#[^\n]*/y },
        { type: 'string', re: /"(?:\\.|[^"\\])*"/y },
        { type: 'string', re: /'[^']*'/y },
        { type: 'variable', re: /\$\{?[A-Za-z_]\w*\}?/y },
        { type: 'number', re: /\b\d+\b/y },
        { type: 'ident', re: /[A-Za-z_][\w-]*/y },
      ]
    case 'json':
      return [
        { type: 'property', re: /"(?:\\.|[^"\\])*"(?=\s*:)/y },
        { type: 'string', re: /"(?:\\.|[^"\\])*"/y },
        { type: 'number', re: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y },
        { type: 'keyword', re: /\b(?:true|false|null)\b/y },
      ]
    case 'yaml':
      return [
        { type: 'comment', re: /#[^\n]*/y },
        { type: 'property', re: /^[ \t]*[A-Za-z_][\w-]*(?=\s*:)/my },
        { type: 'string', re: /"(?:\\.|[^"\\])*"/y },
        { type: 'string', re: /'[^']*'/y },
        { type: 'number', re: /\b\d+(?:\.\d+)?\b/y },
      ]
    case 'css':
      return [
        { type: 'comment', re: /\/\*[\s\S]*?\*\//y },
        { type: 'string', re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y },
        { type: 'number', re: /\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg)?\b/y },
        { type: 'property', re: /[A-Za-z-]+(?=\s*:)/y },
        { type: 'ident', re: /[A-Za-z_#.-][\w-]*/y },
      ]
    case 'html':
      return [
        { type: 'comment', re: /<!--[\s\S]*?-->/y },
        { type: 'tag', re: /<\/?[A-Za-z][\w-]*/y },
        { type: 'string', re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y },
      ]
    default:
      return common
  }
}

/** 对源码做语法高亮，返回可安全插入的 HTML（已转义）。 */
export function highlightCode(code: string, lang: HighlightLang): string {
  if (lang === 'plaintext') return escapeHtml(code)
  const rules = rulesFor(lang)
  const kws = new Set((KEYWORDS[lang] ?? []).map((k) => (lang === 'sql' ? k.toUpperCase() : k)))
  let i = 0
  let out = ''
  const n = code.length
  let guard = 0
  while (i < n) {
    if (++guard > n + 5) break // 安全阀
    let matched = false
    for (const rule of rules) {
      rule.re.lastIndex = i
      const m = rule.re.exec(code)
      if (m && m.index === i && m[0].length > 0) {
        const text = m[0]
        let type = rule.type
        // ident 若命中关键字则升格为 keyword
        if (type === 'ident') {
          const probe = lang === 'sql' ? text.toUpperCase() : text
          if (kws.has(probe)) type = 'keyword'
          else type = 'ident'
        }
        if (type === 'ident') {
          out += escapeHtml(text)
        } else {
          out += `<span class="hl-${type}">${escapeHtml(text)}</span>`
        }
        i += text.length
        matched = true
        break
      }
    }
    if (!matched) {
      out += escapeHtml(code[i])
      i += 1
    }
  }
  return out
}
