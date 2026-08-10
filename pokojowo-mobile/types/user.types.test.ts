import {
  normalizeChatSettings,
  normalizeNotificationPreferences,
  normalizeUser,
  toNotificationPreferencesPayload,
} from './user.types';

describe('user response normalization', () => {
  it('normalizes API aliases used by settings and moderation', () => {
    const user = normalizeUser({
      _id: 'user-1',
      username: 'jan',
      email: 'jan@example.com',
      chatSettings: { blockedUsers: ['user-2'] },
      notificationPreferences: {
        push: { newMessages: false, propertyUpdates: true, matchNotifications: false },
      },
    });

    expect(user.id).toBe('user-1');
    expect(user.chat_settings?.blocked_users).toEqual(['user-2']);
    expect(user.notification_preferences?.push).toEqual({
      new_messages: false,
      property_updates: true,
      match_notifications: false,
    });
  });

  it('supports legacy snake_case settings without changing their meaning', () => {
    expect(normalizeChatSettings({ blocked_users: ['user-3'] })?.blocked_users).toEqual(['user-3']);
    expect(
      normalizeNotificationPreferences({ push: { new_messages: false } })?.push?.new_messages
    ).toBe(false);
  });

  it('serializes canonical preferences to the backend aliases', () => {
    expect(
      toNotificationPreferencesPayload({
        push: {
          new_messages: false,
          property_updates: true,
          match_notifications: false,
        },
      })
    ).toEqual({
      push: {
        newMessages: false,
        propertyUpdates: true,
        matchNotifications: false,
      },
    });
  });
});
