import { describe, expect, test } from 'vitest';

import { splitMatch } from './search';

describe('splitMatch (UI-SRCH-02)', () => {
  test('finds the matching part, ignoring case and spaces', () => {
    expect(splitMatch('Acme renewal', 'RENEW')).toEqual({ before: 'Acme ', match: 'renew', after: 'al' });
    expect(splitMatch('Acme Ltd', '  acme ')).toEqual({ before: '', match: 'Acme', after: ' Ltd' });
  });

  test('takes the first place it appears', () => {
    expect(splitMatch('Acme Acme', 'acme')).toEqual({ before: '', match: 'Acme', after: ' Acme' });
  });

  test('accented letters match too', () => {
    expect(splitMatch('Jürgen Müller', 'MÜLLER')).toEqual({ before: 'Jürgen ', match: 'Müller', after: '' });
  });

  test('nothing to highlight gives null', () => {
    expect(splitMatch('Acme Ltd', 'xyz')).toBeNull();
    expect(splitMatch('Acme Ltd', '   ')).toBeNull();
    // Lower-casing "İ" makes it longer, so positions would be off.
    expect(splitMatch('İstanbul Foods', 'foods')).toBeNull();
  });
});
