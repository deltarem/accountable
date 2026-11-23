import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { Panel } from './Panel';

describe('Panel', () => {
  test('a titled panel is a section named by its heading, with its note beside it', () => {
    render(
      <Panel title="Follow-ups" note="2 to do" labelledBy="follow-ups-title">
        <p>Body</p>
      </Panel>,
    );
    const region = screen.getByRole('region', { name: 'Follow-ups' });
    expect(screen.getByRole('heading', { level: 2, name: 'Follow-ups' })).toBeTruthy();
    expect(region.textContent).toBe('Follow-ups2 to doBody');
  });

  test('a note without a title still shows, with no empty heading', () => {
    render(
      <Panel note="Newest first">
        <p>Body</p>
      </Panel>,
    );
    expect(screen.getByText('Newest first')).toBeTruthy();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  test('with neither title nor note, only the content shows', () => {
    const { container } = render(
      <Panel as="div" dark className="extra">
        <p>Only this</p>
      </Panel>,
    );
    const panel = container.firstElementChild!;
    expect(panel.tagName).toBe('DIV');
    expect(panel.className.split(' ')).toContain('extra');
    expect(panel.textContent).toBe('Only this');
    expect(panel.children).toHaveLength(1);
  });

  test('the dark panel looks different from the white one', () => {
    const { container } = render(
      <>
        <Panel>
          <p>Light</p>
        </Panel>
        <Panel dark>
          <p>Dark</p>
        </Panel>
      </>,
    );
    const [light, dark] = [...container.children];
    expect(light.className).not.toBe(dark.className);
  });
});
