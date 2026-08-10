import { pushNotificationsEnabled } from './pushPreferences';

describe('pushNotificationsEnabled', () => {
  it('defaults to enabled when the account has no preference', () => {
    expect(pushNotificationsEnabled()).toBe(true);
  });

  it('handles nested API preferences', () => {
    expect(pushNotificationsEnabled({ push: { new_messages: false, match_notifications: false } })).toBe(false);
    expect(pushNotificationsEnabled({ push: { new_messages: false, match_notifications: true } })).toBe(true);
  });

  it('handles the legacy flat mobile preference shape', () => {
    expect(pushNotificationsEnabled({ push_new_message: false, push_new_match: false, push_listing_interest: false })).toBe(false);
    expect(pushNotificationsEnabled({ push_new_message: false, push_new_match: true })).toBe(true);
  });
});
