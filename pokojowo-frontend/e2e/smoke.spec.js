import { expect, test } from '@playwright/test';

const listing = {
  _id: 'listing-1',
  title: { en: 'Sunny room near the river' },
  address: 'ul. River 12',
  city: 'Warsaw',
  district: 'Mokotów',
  price: 2400,
  size: 42,
  roomType: 'Single',
  buildingType: 'Apartment',
  maxTenants: 1,
  available: true,
  description: { en: 'A bright, quiet room with a view.' },
  images: [],
};

const match = {
  user_id: 'user-2',
  firstname: 'Maja',
  lastname: 'Kowalska',
  age: 28,
  location: 'Warsaw',
  bio: 'Looking for a calm and friendly home.',
  compatibility_score: 91,
  shared_languages: ['English'],
};

const currentUser = {
  _id: 'user-1',
  email: 'tenant@example.com',
  firstname: 'Alex',
  lastname: 'Tenant',
  role: ['Tenant'],
  isProfileComplete: true,
};

async function mockApi(page) {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
  const requests = [];
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    requests.push({ method, path });

    if (path.endsWith('/auth/register') && method === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'new-user' }) });
    }
    if (path.endsWith('/auth/refresh') && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'fresh-token' }) });
    }
    if (path.endsWith('/users/me') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentUser) });
    }
    if (path.endsWith('/listings/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([listing]) });
    }
    if (path.endsWith('/listings/listing-1') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listing) });
    }
    if (path.endsWith('/matching/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ matches: [match], total_candidates: 1 }) });
    }
    if (path.endsWith('/likes/sent') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ likes: [] }) });
    }
    if (path.endsWith('/favorites/') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved_matches: [], total: 0 }) });
    }
    if (path.endsWith('/likes/user-2') && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ is_mutual: false }) });
    }
    if (path.endsWith('/chat/with/user-2') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ _id: 'chat-1', otherUser: { _id: 'user-2', firstname: 'Maja', lastname: 'Kowalska', isOnline: true } }),
      });
    }
    if (path.endsWith('/messages/room/chat-1') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
    if (path.endsWith('/messages/') && method === 'POST') {
      const body = request.postDataJSON();
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ _id: 'message-1', content: body.content, sender: currentUser._id, roomId: 'chat-1' }),
      });
    }
    if (path.endsWith('/chat/chat-1/read') && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return requests;
}

async function signInAsTenant(page) {
  await page.addInitScript((state) => {
    localStorage.setItem('auth-storage', JSON.stringify({ state, version: 0 }));
    localStorage.setItem('token', state.token);
    localStorage.setItem('refreshToken', state.refreshToken);
  }, {
    token: 'e2e-token',
    refreshToken: 'e2e-refresh',
    user: currentUser,
    isAuthenticated: true,
  });
}

test('signup validates input and browses a listing through its detail page', async ({ page }) => {
  await mockApi(page);
  await page.goto('/signup');

  await page.getByLabel('Username').fill('ab');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByLabel('Confirm Password').fill('different');
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByText('Username must be at least 3 characters')).toBeVisible();
  await expect(page.getByText('Please enter a valid email')).toBeVisible();

  await page.goto('/discover');
  await expect(page.getByText('Sunny room near the river')).toBeVisible();
  await page.getByRole('link', { name: /Sunny room near the river/ }).click();
  await expect(page.getByRole('heading', { name: 'Sunny room near the river' })).toBeVisible();
  await expect(page.getByText('ul. River 12')).toBeVisible();
});

test('swipes a match and sends a chat message', async ({ page }) => {
  await mockApi(page);
  await signInAsTenant(page);

  await page.goto('/matches');
  await expect(page.getByRole('heading', { name: /Maja/ })).toBeVisible();
  await page.getByRole('button', { name: 'Like' }).click();
  await expect(page.getByText('Liked')).toBeVisible();

  await page.goto('/chat/with/user-2');
  const composer = page.getByPlaceholder('Type a message…');
  await composer.fill('Hello from the smoke test');
  await page.locator('form').last().getByRole('button').click();
  await expect(page.getByText('Hello from the smoke test')).toBeVisible();
});
