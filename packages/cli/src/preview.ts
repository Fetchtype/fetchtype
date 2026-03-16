import { createServer } from 'node:http';
import { readFileSync, watch } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildTokenArtifacts,
  generateHtmlReport,
} from '@fetchtype/core';

function escapePreviewHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(absolutePath: string): string {
  try {
    const contents = readFileSync(absolutePath, 'utf8');
    const input = JSON.parse(contents);
    const artifacts = buildTokenArtifacts(input);
    return generateHtmlReport(artifacts.tokenSet, artifacts.report, artifacts.css);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[fetchtype preview] Error: ${message}\n`);
    return `<!DOCTYPE html><html><body><pre style="color:red;">${escapePreviewHtml(message)}</pre></body></html>`;
  }
}

export function startPreviewServer(
  tokenFilePath: string,
  port = 3000,
): Promise<void> {
  const absolutePath = resolve(tokenFilePath);
  let cachedHtml = buildHtml(absolutePath);

  const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(cachedHtml);
  });

  return new Promise<void>((resolvePromise, reject) => {
    server.listen(port, () => {
      process.stderr.write(`[fetchtype preview] http://localhost:${port}\n`);
      process.stderr.write(`[fetchtype preview] Watching ${absolutePath}\n`);

      try {
        const watcher = watch(absolutePath, () => {
          process.stderr.write(`[fetchtype preview] File changed, rebuilding...\n`);
          cachedHtml = buildHtml(absolutePath);
        });

        process.on('SIGINT', () => {
          watcher.close();
          server.close();
          resolvePromise();
        });

        process.on('SIGTERM', () => {
          watcher.close();
          server.close();
          resolvePromise();
        });
      } catch {
        // watch may not be available; server still works without auto-reload
      }
    });

    server.on('error', reject);
  });
}
