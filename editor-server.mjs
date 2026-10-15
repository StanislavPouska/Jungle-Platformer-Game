/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Standalone Level Editor application.
//
// This is what editor.exe launches (npm run editor -> node editor-server.mjs).
// Unlike the browser game, this process runs on Node and therefore has real
// filesystem access: it reads and writes the game's content file directly at
// public/world.json. That file is the single source of truth for level design
// — the browser game fetches it at startup. Editing here permanently changes
// the game content on disk; there is no "default vs edited" copy anymore.
//
// The editor UI itself is the same React app (editor.html / EditorApp.tsx),
// served here through Vite in middleware mode so it stays a normal dev
// experience (HMR, TS, Tailwind) while the file API lives alongside it.

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const here = dirname(fileURLToPath(import.meta.url));
const WORLD_FILE = resolve(here, 'public', 'world.json');
const PORT = Number(process.env.EDITOR_PORT) || 3000;

// Build the default world from the compiled-in seed data, used only when
// public/world.json does not yet exist (fresh checkout that never ran the
// seed script). Loaded through Vite's SSR loader so the TS imports resolve.
async function seedWorld(vite) {
  const data = await vite.ssrLoadModule('/src/data.ts');
  return {
    missions: data.INITIAL_MISSIONS,
    fights: data.INITIAL_FIGHTS,
    quizzes: data.INITIAL_QUIZZES,
    questionPool: data.INITIAL_QUESTIONS,
    sprites: data.INITIAL_SPRITES,
  };
}

async function main() {
  const app = express();
  // World JSON can be large (embedded base64 sprite frames / backgrounds).
  app.use(express.json({ limit: '64mb' }));

  // 'mpa' so Vite serves our two real HTML pages (index.html, editor.html)
  // and transforms them; 'custom' would skip HTML serving entirely.
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'mpa',
    root: here,
  });

  // --- File API: the whole point of the standalone editor --------------------

  // Read the current game content from disk (seeding the file on first run).
  app.get('/api/world', async (_req, res) => {
    try {
      if (!existsSync(WORLD_FILE)) {
        const seeded = await seedWorld(vite);
        await mkdir(dirname(WORLD_FILE), { recursive: true });
        await writeFile(WORLD_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
        return res.json(seeded);
      }
      const raw = await readFile(WORLD_FILE, 'utf-8');
      res.type('application/json').send(raw);
    } catch (err) {
      console.error('GET /api/world failed:', err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Write edited game content straight back to public/world.json on disk.
  // This is the permanent save — no localStorage, no merge.
  app.post('/api/world', async (req, res) => {
    try {
      const world = req.body;
      if (!world || !Array.isArray(world.missions)) {
        return res.status(400).json({ ok: false, error: 'Invalid world payload' });
      }
      await mkdir(dirname(WORLD_FILE), { recursive: true });
      await writeFile(WORLD_FILE, JSON.stringify(world, null, 2), 'utf-8');
      res.json({ ok: true, savedAt: new Date().toISOString() });
    } catch (err) {
      console.error('POST /api/world failed:', err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // --- Editor UI (served by Vite) --------------------------------------------
  app.use(vite.middlewares);

  const server = app.listen(PORT, () => {
    const url = `http://localhost:${PORT}/editor.html`;
    console.log('');
    console.log("  Mowgli's Toad Jumper — Level Editor");
    console.log('  -----------------------------------');
    console.log(`  Editor running at: ${url}`);
    console.log(`  Writing game content to: ${WORLD_FILE}`);
    console.log('  Keep this window open while editing; close it to stop.');
    console.log('');
    // Open the default browser at the editor page (Windows/macOS/Linux).
    const opener =
      process.platform === 'win32' ? `start "" "${url}"`
      : process.platform === 'darwin' ? `open "${url}"`
      : `xdg-open "${url}"`;
    exec(opener, { shell: true }, () => { /* best-effort; ignore failures */ });
  });

  const shutdown = () => {
    server.close();
    vite.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Editor server failed to start:', err);
  process.exit(1);
});
