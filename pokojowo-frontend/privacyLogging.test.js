/* global process */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const sourceFiles = [
  'src/hooks/useNotificationListener.js',
  'src/components/shared/NotificationDropdown.jsx',
  'src/features/chat/pages/ChatRoom.jsx',
];

describe('browser logging privacy', () => {
  it('does not log chat or notification payloads', () => {
    sourceFiles.forEach((file) => {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source, file).not.toMatch(/console\.log/);
      expect(source, file).not.toMatch(/console\.(?:warn|error)\([^\n]*,\s*\w/);
    });
  });
});
