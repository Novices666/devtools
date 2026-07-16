import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('native control styling', () => {
  it('uses white details for custom checkboxes and ranges', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

    expect(css).toContain('.checkbox-control:checked')
    expect(css).toContain("stroke='white'")
    expect(css).toContain('.range-control::-webkit-slider-runnable-track')
    expect(css).toMatch(/#fff var\(--range-progress\) 100%/)
  })
})
