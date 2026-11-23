// What the delete dialog says will happen (UI-DEL-01, UI-DEL-04). The contact
// wording never uses a pronoun for the contact.

import type { DeleteImpact } from '../api/hooks';
import { plural } from './format';

const FINAL = "This can't be undone.";

export function deleteTitle(name: string) {
  return `Delete ${name}?`;
}

function organizationDeleteBody(impact: DeleteImpact): string {
  const contacts = impact.contacts ?? 0;
  const deals = impact.deals ?? 0;
  if (contacts === 0 && deals === 0) return `It has no contacts or deals. ${FINAL}`;
  const kept = [contacts ? plural(contacts, 'contact') : '', deals ? plural(deals, 'deal') : '']
    .filter(Boolean)
    .join(' and ');
  return `Its ${kept} will be kept, with no organization. ${FINAL}`;
}

function contactDeleteBody(impact: DeleteImpact): string {
  const activities = impact.activities ?? 0;
  const deals = impact.deals ?? 0;
  const parts: string[] = [];
  if (activities > 0) {
    parts.push(`${plural(activities, 'activity', 'activities')} logged with this contact will be deleted.`);
  }
  if (deals > 0) parts.push(`${plural(deals, 'deal')} will be kept, with no main contact.`);
  parts.push(FINAL);
  return parts.join(' ');
}

function dealDeleteBody(impact: DeleteImpact): string {
  const activities = impact.activities ?? 0;
  if (activities > 0) {
    return `Its ${plural(activities, 'activity', 'activities')} and its stage history will be deleted. ${FINAL}`;
  }
  if ((impact.events ?? 0) > 0) return `Its stage history will be deleted. ${FINAL}`;
  return FINAL;
}

export function deleteBody(kind: 'organizations' | 'contacts' | 'deals', impact: DeleteImpact): string {
  if (kind === 'organizations') return organizationDeleteBody(impact);
  if (kind === 'contacts') return contactDeleteBody(impact);
  return dealDeleteBody(impact);
}

const TYPE_WORD = { note: 'note', call: 'call', email: 'email' } as const;

export function activityDeleteTitle(type: keyof typeof TYPE_WORD) {
  return `Delete this ${TYPE_WORD[type]}?`;
}

export const ACTIVITY_DELETE_BODY = FINAL;
