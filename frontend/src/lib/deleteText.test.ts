import { describe, expect, test } from 'vitest';

import { ACTIVITY_DELETE_BODY, activityDeleteTitle, deleteBody, deleteTitle } from './deleteText';

test('the title names the record', () => {
  expect(deleteTitle('Northwind Traders')).toBe('Delete Northwind Traders?');
});

describe('organization (UI-DEL-01)', () => {
  test('says its contacts and deals are kept', () => {
    expect(deleteBody('organizations', { name: 'Northwind Traders', contacts: 3, deals: 2 })).toBe(
      "Its 3 contacts and 2 deals will be kept, with no organization. This can't be undone.",
    );
  });

  test('leaves out a count of zero', () => {
    expect(deleteBody('organizations', { name: 'N', contacts: 1, deals: 0 })).toBe(
      "Its 1 contact will be kept, with no organization. This can't be undone.",
    );
    expect(deleteBody('organizations', { name: 'N', deals: 1 })).toBe(
      "Its 1 deal will be kept, with no organization. This can't be undone.",
    );
  });

  test('with neither, says so', () => {
    expect(deleteBody('organizations', { name: 'N' })).toBe("It has no contacts or deals. This can't be undone.");
  });
});

describe('contact (UI-DEL-01)', () => {
  test('says what is deleted and what is kept, without a pronoun for the contact', () => {
    expect(deleteBody('contacts', { name: 'Maria Lopez', activities: 4, deals: 2 })).toBe(
      "4 activities logged with this contact will be deleted. 2 deals will be kept, with no main contact. This can't be undone.",
    );
  });

  test('leaves out parts with a count of zero', () => {
    expect(deleteBody('contacts', { name: 'M', activities: 1 })).toBe(
      "1 activity logged with this contact will be deleted. This can't be undone.",
    );
    expect(deleteBody('contacts', { name: 'M', deals: 1 })).toBe(
      "1 deal will be kept, with no main contact. This can't be undone.",
    );
    expect(deleteBody('contacts', { name: 'M' })).toBe("This can't be undone.");
  });
});

describe('deal (UI-DEL-01)', () => {
  test('with activities, says they go with the stage history', () => {
    expect(deleteBody('deals', { name: 'Acme renewal', activities: 5, events: 3 })).toBe(
      "Its 5 activities and its stage history will be deleted. This can't be undone.",
    );
  });

  test('with only a stage history, says that goes', () => {
    expect(deleteBody('deals', { name: 'Acme renewal', activities: 0, events: 2 })).toBe(
      "Its stage history will be deleted. This can't be undone.",
    );
  });

  test('with nothing attached, only says it cannot be undone', () => {
    expect(deleteBody('deals', { name: 'Acme renewal' })).toBe("This can't be undone.");
  });
});

test('an activity is named by its type (UI-DEL-04)', () => {
  expect(activityDeleteTitle('call')).toBe('Delete this call?');
  expect(activityDeleteTitle('email')).toBe('Delete this email?');
  expect(activityDeleteTitle('note')).toBe('Delete this note?');
  expect(ACTIVITY_DELETE_BODY).toBe("This can't be undone.");
});
