import { expect, test } from './fixtures';
import { choose } from './tables';

// SC-07: clear errors, and nothing is saved until they're fixed.

test('organization: a missing name', async ({ page, api }) => {
  await page.goto('/organizations');
  await page.getByRole('button', { name: 'New organization' }).click();
  const form = page.getByRole('dialog', { name: 'New organization' });
  await form.getByLabel('Industry').fill('Retail');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form.getByText('Enter a name')).toBeVisible();
  await expect(form.getByLabel(/^Name/)).toBeFocused();
  expect((await api.get('/organizations')).length).toBe(10);
  await form.getByLabel(/^Name/).fill('Fixed Ltd');
  await expect(form.getByText('Enter a name')).toBeHidden();
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form).toBeHidden();
  expect((await api.get('/organizations')).length).toBe(11);
});

test('contact: a missing name and a badly formed email', async ({ page, api }) => {
  await page.goto('/contacts');
  await page.getByRole('button', { name: 'New contact' }).click();
  const form = page.getByRole('dialog', { name: 'New contact' });
  await form.getByLabel('Email').fill('maria-at-acme');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form.getByText('Enter a name')).toBeVisible();
  await expect(form.getByText('Enter an email like name@company.com')).toBeVisible();
  expect((await api.get('/contacts')).length).toBe(25);
  await form.getByLabel(/^Name/).fill('Maria Lopez');
  await form.getByLabel('Email').fill('maria@acme.example');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form).toBeHidden();
  expect((await api.get('/contacts')).length).toBe(26);
});

test('deal: a negative value and a probability of 120', async ({ page, api }) => {
  await page.goto('/deals');
  await page.getByRole('button', { name: 'New deal' }).click();
  const form = page.getByRole('dialog', { name: 'New deal' });
  await form.getByLabel(/^Name/).fill('Bad numbers');
  await form.getByLabel('Value (USD)').fill('-5');
  await form.getByLabel('Probability').fill('120');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form.getByText('Choose an organization', { exact: true }).last()).toBeVisible();
  await expect(form.getByText("Value can't be negative")).toBeVisible();
  await expect(form.getByText('Probability must be between 0 and 100')).toBeVisible();
  expect((await api.get('/deals')).length).toBe(30);

  await form.getByLabel('Value (USD)').fill('12.5');
  await form.getByLabel('Value (USD)').blur();
  await expect(form.getByText('Use a comma for cents, like 12.500,50')).toBeVisible();

  await choose(page, 'Organization', 'Larch Software');
  await form.getByLabel('Value (USD)').fill('12.500,50');
  await form.getByLabel('Probability').fill('60');
  await form.getByRole('button', { name: 'Save' }).click();
  await expect(form).toBeHidden();
  const saved = await api.find('deals', 'Bad numbers');
  expect(saved.value_cents).toBe(1_250_050);
  expect(saved.probability).toBe(60);
});

test('activity: a missing description', async ({ page, api }) => {
  const contact = await api.find('contacts', 'Tom Becker');
  await page.goto(`/contacts/${contact.id}`);
  const log = page.getByRole('form', { name: 'Log activity' });
  await log.getByRole('button', { name: 'Log it' }).click();
  await expect(log.getByText('Describe what happened')).toBeVisible();
  await expect(page.getByTestId('timeline-entry')).toHaveCount(1);
});
