const JSON_PATH_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** 为对象键生成无歧义的 JSONPath。 */
export function appendJsonPath(parent: string, key: string): string {
  return JSON_PATH_IDENTIFIER.test(key)
    ? `${parent}.${key}`
    : `${parent}[${JSON.stringify(key)}]`
}
