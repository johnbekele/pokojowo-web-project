import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

import MessageBubble from './MessageBubble';

const message = {
  id: 'message-1',
  content: 'Hello',
  createdAt: '2026-08-10T10:00:00.000Z',
};

describe('MessageBubble accessibility', () => {
  it('names the message options control for the sender', () => {
    render(<MessageBubble message={message} isMine onReply={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'accessibility.messageOptions' }),
    ).toBeInTheDocument();
  });

  it('names the reply control for messages from another user', () => {
    render(<MessageBubble message={message} isMine={false} onReply={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'accessibility.reply' })).toBeInTheDocument();
  });
});
