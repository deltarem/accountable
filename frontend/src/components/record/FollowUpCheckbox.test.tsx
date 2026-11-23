import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';

import { serverError } from '../../test/recordHelpers';
import { mockFetch, renderWithProviders } from '../../test/utils';
import { FollowUpCheckbox } from './FollowUpCheckbox';

function postedBodies(fetch: ReturnType<typeof mockFetch>, url: string) {
  return fetch.mock.calls
    .filter(([input, init]) => input === url && init?.method === 'POST')
    .map(([, init]) => JSON.parse(String(init?.body)));
}

test('ticking the box marks the follow-up done on the server', async () => {
  const fetch = mockFetch({ 'POST /api/activities/7/done': { id: 7, follow_up_done: true } });
  renderWithProviders(<FollowUpCheckbox activityId={7} done={false} label="Done" description="Call back" />);
  const box = screen.getByRole('checkbox', { name: 'Done' }) as HTMLInputElement;
  expect(box.checked).toBe(false);
  await userEvent.click(box);
  expect(box.checked).toBe(true);
  await waitFor(() => expect(postedBodies(fetch, '/api/activities/7/done')).toEqual([{ done: true }]));
  expect(box.checked).toBe(true);
});

test('unticking a done follow-up makes it due again', async () => {
  const fetch = mockFetch({ 'POST /api/activities/7/done': { id: 7, follow_up_done: false } });
  renderWithProviders(<FollowUpCheckbox activityId={7} done label="Done" description="Call back" />);
  const box = screen.getByRole('checkbox', { name: 'Done' }) as HTMLInputElement;
  expect(box.checked).toBe(true);
  await userEvent.click(box);
  expect(box.checked).toBe(false);
  await waitFor(() => expect(postedBodies(fetch, '/api/activities/7/done')).toEqual([{ done: false }]));
});

test('if the server refuses, the box goes back and a message says so (UI-ERR-01)', async () => {
  mockFetch({ 'POST /api/activities/7/done': () => serverError() });
  renderWithProviders(<FollowUpCheckbox activityId={7} done={false} label="Done" description="Call back" />);
  const box = screen.getByRole('checkbox', { name: 'Done' }) as HTMLInputElement;
  await userEvent.click(box);
  expect(await screen.findByText("Couldn't update the follow-up. Try again.")).toBeTruthy();
  expect(box.checked).toBe(false);
});

test('with the label hidden, the box is named after the follow-up', () => {
  mockFetch({});
  renderWithProviders(
    <FollowUpCheckbox activityId={7} done={false} label="Done" description="Send the contract" hideLabel />,
  );
  expect(screen.getByRole('checkbox', { name: 'Mark done: Send the contract' })).toBeTruthy();
  expect(screen.queryByText('Done')).toBeNull();
});

function ServerValue() {
  const [done, setDone] = useState(false);
  return (
    <>
      <FollowUpCheckbox activityId={7} done={done} label="Done" description="Call back" />
      <button type="button" onClick={() => setDone(true)}>
        Done elsewhere
      </button>
    </>
  );
}

test('the box follows the server value when it changes', async () => {
  mockFetch({});
  renderWithProviders(<ServerValue />);
  const box = screen.getByRole('checkbox', { name: 'Done' }) as HTMLInputElement;
  expect(box.checked).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Done elsewhere' }));
  expect(box.checked).toBe(true);
});
