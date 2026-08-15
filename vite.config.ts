/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      // Register explicitly from the web entry point so the Tauri desktop
      // container never installs a Service Worker for its embedded assets.
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '开发者工具箱 DevToolbox',
        short_name: 'DevToolbox',
        description: '离线优先的聚合式开发者工具箱',
        theme_color: '#0ea5e9',
        background_color: '#0f172a',
        display: 'standalone',
        lang: 'zh-CN',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    // Keep ZBar's WASM inside the browser module so Tauri does not depend on
    // an external asset URL or WebView custom-protocol path.
    conditions: ['browser', 'zbar-inlined'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
