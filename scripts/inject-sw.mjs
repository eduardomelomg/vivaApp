import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve('dist')
const indexPath = resolve(dist, 'index.html')
const workerPath = resolve(dist, 'sw.js')
const html = readFileSync(indexPath, 'utf8')
const worker = readFileSync(workerPath, 'utf8')
const buildAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(match => match[1])
const baseAssets = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png']
const appShell = [...new Set([...baseAssets, ...buildAssets])]
const appShellPattern = /const APP_SHELL = \[[^\]]*\]/

if (!appShellPattern.test(worker)) throw new Error('Não foi possível localizar APP_SHELL no service worker')
const injected = worker.replace(appShellPattern, `const APP_SHELL = ${JSON.stringify(appShell)}`)
writeFileSync(workerPath, injected)
console.log(`PWA: ${appShell.length} arquivos preparados para uso offline.`)
