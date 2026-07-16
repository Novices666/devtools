/** 复制文本并返回实际结果；Clipboard API 不可用时回退到 execCommand。 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 继续使用兼容性回退。
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    return typeof document.execCommand === 'function' && document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}
