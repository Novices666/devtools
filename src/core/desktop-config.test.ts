import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('desktop configuration', () => {
  it('creates the tray only from Rust', () => {
    const config = JSON.parse(readProjectFile('src-tauri/tauri.conf.json')) as {
      app: Record<string, unknown>
    }
    const rust = readProjectFile('src-tauri/src/lib.rs')

    expect(config.app.trayIcon).toBeUndefined()
    expect(rust.match(/TrayIconBuilder::with_id\("main"\)/g) ?? []).toHaveLength(1)
  })

  it('keeps file associations retired and limits file access to explicit saves', () => {
    const config = JSON.parse(readProjectFile('src-tauri/tauri.conf.json')) as {
      bundle: Record<string, unknown>
    }
    const capabilities = JSON.parse(readProjectFile('src-tauri/capabilities/default.json')) as {
      permissions: Array<string | { identifier: string }>
    }
    const permissionIds = capabilities.permissions.map((permission) =>
      typeof permission === 'string' ? permission : permission.identifier,
    )

    expect(config.bundle.fileAssociations).toBeUndefined()
    expect(
      permissionIds.filter((id) => id.startsWith('fs:') || id.startsWith('dialog:')),
    ).toEqual(['dialog:allow-save', 'fs:allow-write-file'])
    expect(permissionIds).not.toContain('fs:scope')

    const rust = readProjectFile('src-tauri/src/lib.rs')
    expect(rust).toContain('.plugin(tauri_plugin_dialog::init())')
    expect(rust).toContain('.plugin(tauri_plugin_fs::init())')
  })
})
