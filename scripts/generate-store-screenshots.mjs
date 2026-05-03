#!/usr/bin/env node
/**
 * Generate clean placeholder Play screenshots for listing draft/review.
 *
 * Real-device screenshots remain preferred for final launch and can be captured
 * with npm run store:capture-screenshots. These generated images keep strict
 * release preflight deterministic while listing copy/assets are being prepared.
 */

import { mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const outputDir = resolve(root, 'docs/store-assets/screenshots');
const iconPath = resolve(root, 'assets/icon.png');
const fontPath = '/System/Library/Fonts/Helvetica.ttc';

mkdirSync(outputDir, { recursive: true });

const screenshots = [
  {
    file: '01-welcome.png',
    title: 'Begin Dinner',
    subtitle: 'A calm ritual for sharing daily highs and lows.',
    accent: '#f59e0b',
  },
  {
    file: '02-family.png',
    title: 'Set Up Your Family',
    subtitle: 'Add names and playful emoji characters in under a minute.',
    accent: '#fb7185',
  },
  {
    file: '03-rose.png',
    title: 'Share a Rose',
    subtitle: 'Capture the bright moment and reflect with a gentle prompt.',
    accent: '#fbbf24',
  },
  {
    file: '04-thorn.png',
    title: 'Name a Thorn',
    subtitle: 'Make space for hard parts of the day with curiosity.',
    accent: '#34d399',
  },
  {
    file: '05-summary.png',
    title: 'Close Together',
    subtitle: 'Review everyone’s reflections with warm generated artwork.',
    accent: '#a78bfa',
  },
  {
    file: '06-history.png',
    title: 'Keep the Story',
    subtitle: 'Browse past dinners offline. Export only when you choose.',
    accent: '#38bdf8',
  },
];

function runMagick(args) {
  execFileSync('magick', args, { stdio: 'inherit' });
}

for (const screenshot of screenshots) {
  const output = resolve(outputDir, screenshot.file);
  runMagick([
    '-size', '1080x1920', 'gradient:#fffbeb-#fde68a',
    '-fill', '#fff7ed', '-draw', 'roundrectangle 86,96 994,1824 56,56',
    '-fill', screenshot.accent, '-draw', 'circle 540,430 540,225',
    '-fill', '#ffffff', '-draw', 'roundrectangle 170,690 910,1195 42,42',
    '-fill', '#fef3c7', '-draw', 'roundrectangle 220,760 860,835 30,30',
    '-fill', '#fde68a', '-draw', 'roundrectangle 220,895 760,960 28,28',
    '-fill', '#bbf7d0', '-draw', 'roundrectangle 220,1030 830,1095 28,28',
    '(', iconPath, '-resize', '230x230', ')', '-geometry', '+425+315', '-composite',
    '-font', fontPath, '-fill', '#78350f', '-pointsize', '76', '-gravity', 'north', '-annotate', '+0+1280', screenshot.title,
    '-fill', '#57534e', '-pointsize', '38', '-gravity', 'north', '-annotate', '+0+1400', screenshot.subtitle,
    '-fill', '#92400e', '-pointsize', '30', '-gravity', 'south', '-annotate', '+0+120', 'Rose & Thorn',
    output,
  ]);
}

console.log(`Generated ${screenshots.length} screenshots in docs/store-assets/screenshots/`);
