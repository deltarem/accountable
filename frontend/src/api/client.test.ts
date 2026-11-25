import { describe, expect, test, vi } from 'vitest';

import { ApiError, api, connectSession, request } from './client';

function answer(status: number, body?: unknown) {
  const text = body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body);
  const spy = vi.fn(async () => new Response(text, { status }));
  vi.stubGlobal('fetch', spy);
  return spy;
}

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => {
      throw new Error('expected the request to fail');
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe('request', () => {
  test('returns the JSON body on success', async () => {
    answer(200, { id: 3, name: 'Acme Ltd' });
    await expect(request('GET', '/organizations/3')).resolves.toEqual({ id: 3, name: 'Acme Ltd' });
  });

  test('a 204 answer resolves with nothing', async () => {
    answer(204);
    await expect(request('DELETE', '/deals/3')).resolves.toBeUndefined();
  });

  test('a network failure becomes status 0 with a message to check the server (UI-ERR-01)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const error = await failure(request('GET', '/deals'));
    expect(error.status).toBe(0);
    expect(error.message).toBe("Couldn't reach the server. Check that Accountable is running.");
    expect(error.isValidation).toBe(false);
  });

  test('a 422 carries one message per field, for the form to show', async () => {
    answer(422, {
      detail: 'Check the highlighted fields.',
      errors: { name: 'Enter a name.', value_cents: 'Too big.' },
    });
    const error = await failure(request('POST', '/deals', {}));
    expect(error.status).toBe(422);
    expect(error.message).toBe('Check the highlighted fields.');
    expect(error.fieldErrors).toEqual({ name: 'Enter a name.', value_cents: 'Too big.' });
    expect(error.isValidation).toBe(true);
  });

  test('a 422 without field errors is not treated as a validation error', async () => {
    answer(422, { detail: 'Something is off.' });
    const error = await failure(request('POST', '/deals', {}));
    expect(error.fieldErrors).toEqual({});
    expect(error.isValidation).toBe(false);
  });

  test("any other failure carries the server's detail text", async () => {
    answer(409, { detail: 'A won deal cannot move back.' });
    const error = await failure(request('POST', '/deals/3/move', {}));
    expect(error.status).toBe(409);
    expect(error.message).toBe('A won deal cannot move back.');
  });

  test('a failure whose detail is not text gets a plain message with the status', async () => {
    answer(400, { detail: [{ loc: ['body'], msg: 'bad' }] });
    const error = await failure(request('POST', '/deals', {}));
    expect(error.message).toBe('The server answered with an error (400).');
  });

  test('a failure with a body that is not JSON still becomes an ApiError', async () => {
    answer(502, '<html>Bad gateway</html>');
    const error = await failure(request('GET', '/deals'));
    expect(error.status).toBe(502);
    expect(error.message).toBe('The server answered with an error (502).');
    expect(error.fieldErrors).toEqual({});
  });
});

describe('api', () => {
  test('get sends no body and no content type, under /api', async () => {
    const spy = answer(200, []);
    await api.get('/deals');
    expect(spy).toHaveBeenCalledWith('/api/deals', { method: 'GET', headers: undefined, body: undefined });
  });

  test('post sends JSON, and an empty object when there is no body', async () => {
    const spy = answer(200, {});
    await api.post('/deals', { name: 'Renewal' });
    await api.post('/deals/3/duplicate');
    const json = { 'Content-Type': 'application/json' };
    expect(spy).toHaveBeenNthCalledWith(1, '/api/deals', { method: 'POST', headers: json, body: '{"name":"Renewal"}' });
    expect(spy).toHaveBeenNthCalledWith(2, '/api/deals/3/duplicate', { method: 'POST', headers: json, body: '{}' });
  });

  test('put sends the body as JSON', async () => {
    const spy = answer(200, {});
    await api.put('/deals/3', { name: 'Renewal' });
    expect(spy).toHaveBeenCalledWith('/api/deals/3', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Renewal"}',
    });
  });

  test('delete uses the DELETE method', async () => {
    const spy = answer(204);
    await expect(api.delete('/deals/3')).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith('/api/deals/3', { method: 'DELETE', headers: undefined, body: undefined });
  });
});

describe('the session (AUTH-01, AUTH-03)', () => {
  test("every call carries the session's token", async () => {
    const spy = answer(200, []);
    const disconnect = connectSession({ token: async () => 'abc', onUnauthorized: vi.fn() });
    await api.get('/deals');
    await api.post('/deals', { name: 'Renewal' });
    disconnect();
    expect(spy).toHaveBeenNthCalledWith(1, '/api/deals', {
      method: 'GET',
      headers: { Authorization: 'Bearer abc' },
      body: undefined,
    });
    expect(spy).toHaveBeenNthCalledWith(2, '/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer abc' },
      body: '{"name":"Renewal"}',
    });
  });

  test('a 401 tells the session, which ends it', async () => {
    answer(401, { detail: 'Sign in to continue' });
    const onUnauthorized = vi.fn();
    const disconnect = connectSession({ token: async () => 'old', onUnauthorized });
    const error = await failure(api.get('/deals'));
    disconnect();
    expect(error.status).toBe(401);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  test('the local sign-in sends no token, and its 401 is a wrong password, not an ended session', async () => {
    const spy = answer(401, { detail: 'Email or password is wrong' });
    const onUnauthorized = vi.fn();
    const disconnect = connectSession({ token: async () => 'old', onUnauthorized });
    const error = await failure(request('POST', '/local/sign-in', { email: 'a', password: 'b' }, { signIn: true }));
    disconnect();
    expect(error.message).toBe('Email or password is wrong');
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('/api/local/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":"a","password":"b"}',
    });
  });

  test('disconnecting leaves the client signed out', async () => {
    const spy = answer(200, []);
    connectSession({ token: async () => 'abc', onUnauthorized: vi.fn() })();
    await api.get('/deals');
    expect(spy).toHaveBeenCalledWith('/api/deals', { method: 'GET', headers: undefined, body: undefined });
  });
});
