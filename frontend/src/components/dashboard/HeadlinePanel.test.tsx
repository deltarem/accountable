import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { giveChartsASize } from '../../test/chartSize';
import { makeDashboard } from '../../test/dashboardFixtures';
import { HeadlinePanel } from './HeadlinePanel';

beforeEach(() => giveChartsASize(600, 232));

const wonContext = () => screen.getByTestId('won-this-month').nextElementSibling!.textContent;

describe('HeadlinePanel (UI-DASH-01)', () => {
  test('a rise on last month shows an up pill naming the month', () => {
    render(<HeadlinePanel data={makeDashboard({ won_change_pct: 37 })} />);
    expect(wonContext()).toBe('37% up on October');
  });

  test('a fall shows a down pill with the size of the drop', () => {
    render(<HeadlinePanel data={makeDashboard({ won_change_pct: -12 })} />);
    expect(wonContext()).toBe('12% down on October');
  });

  test('with nothing won last month, it says so instead of a percentage', () => {
    render(<HeadlinePanel data={makeDashboard({ won_change_pct: null })} />);
    expect(wonContext()).toBe('Nothing won in October');
  });

  test('without a month history it falls back to "last month"', () => {
    render(<HeadlinePanel data={makeDashboard({ won_change_pct: null, months: [] })} />);
    expect(wonContext()).toBe('Nothing won in last month');
  });

  test('follow-ups due: overdue count and today count', () => {
    render(<HeadlinePanel data={makeDashboard({ overdue_count: 4, due_today_count: 2 })} />);
    const figure = screen.getByTestId('follow-ups-due');
    expect(figure.textContent).toBe('4 overdue');
    expect(figure.nextElementSibling!.textContent).toBe('2 due today');
  });

  test('the overdue count is only highlighted when there is something overdue', () => {
    const { unmount } = render(<HeadlinePanel data={makeDashboard({ overdue_count: 4 })} />);
    const highlighted = within(screen.getByTestId('follow-ups-due')).getByText('4').className;
    unmount();
    render(<HeadlinePanel data={makeDashboard({ overdue_count: 0 })} />);
    expect(highlighted).not.toBe('');
    expect(within(screen.getByTestId('follow-ups-due')).getByText('0').className).toBe('');
  });

  test('the revenue chart sits beside the figures with the 12-month total', () => {
    render(<HeadlinePanel data={makeDashboard()} />);
    expect(screen.getByRole('heading', { name: 'Revenue won' })).toBeTruthy();
    expect(screen.getByText('Last 12 months · $668.000')).toBeTruthy();
    expect(screen.getByTestId('revenue-chart')).toBeTruthy();
  });

  test('while loading, placeholders hold the layout and the panel is marked busy (UI-EMPTY-05)', () => {
    render(<HeadlinePanel data={undefined} />);
    const panel = screen.getByRole('region', { name: 'Headline figures' });
    expect(panel.getAttribute('aria-busy')).toBe('true');
    expect(within(panel).getAllByTestId('skeleton').length).toBeGreaterThan(4);
    expect(screen.queryByTestId('open-pipeline')).toBeNull();
  });
});
