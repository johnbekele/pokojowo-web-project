import { routeForNotification } from './notificationRouting';

function router() {
  return { push: jest.fn() } as never;
}

describe('notification routing', () => {
  it('opens a chat when a message notification includes a room', () => {
    const instance = router();
    routeForNotification(instance, { type: 'new_message', data: { chatId: 'chat-7' } } as never);

    expect((instance as any).push).toHaveBeenCalledWith('/(app)/(chat)/chat-7');
  });

  it('opens a match profile for a like', () => {
    const instance = router();
    routeForNotification(instance, { type: 'new_like', data: { likerId: 'user-7' } } as never);

    expect((instance as any).push).toHaveBeenCalledWith('/(app)/(matches)/profile/user-7');
  });

  it('falls back to the matches list when a mutual match has no user id', () => {
    const instance = router();
    routeForNotification(instance, { type: 'mutual_match', data: {} } as never);

    expect((instance as any).push).toHaveBeenCalledWith('/(app)/(matches)');
  });

  it('ignores unknown notification types', () => {
    const instance = router();
    routeForNotification(instance, { type: 'future_event', data: {} } as never);

    expect((instance as any).push).not.toHaveBeenCalled();
  });
});
