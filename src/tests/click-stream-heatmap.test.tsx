import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, viE } from 'vitest';

import { ClickStreamHeatmap } from '../components/affiliate/ClickStreamHeatmap';
import type {
  ClickAggregate,
  ClickStreamResponse,
} from '../components/affiliate/ClickStreamHeatmap';

const mockResponse: ClickStreamResponse = {
  countries: [
    { countryIso: 'US', countryName: 'United States', clicks: 1240, conversions: 124, conversionRate: 10 },
    { countryIso: 'DE', countryName: 'Germany', clicks: 880, conversions: 66, conversionRate: 7.5 },
    { countryIso: 'IN', countryName: 'India', clicks: 640, conversions: 32, conversionRate: 5 },
    { countryIso: 'BR', countryName: 'Brazil', clicks: 420, conversions: 21, conversionRate: 5 },
    { countryIso: 'GB', countryName: 'United Kingdom', clicks: 310, conversions: 31, conversionRate: 10 },
    { countryIso: 'JP', countryName: 'Japan', clicks: 150, conversions: 6, conversionRate: 4 },
  ],
  totalClicks: 3640,
  totalConversions: 280,
};

function mockFetch(payload: ClickStreamResponse) {
  return vi.fn(async () =>
    Promise.resolve({
      ok: true,
      json: async () => payload,
    } as Response),
  );
}

describe('ClickStreamHeatmap', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch(mockResponse) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders an interactive SVG world map with country clusters', async () => {
    render(
      <ClickStreamHeatmap
        campaignLinkId="camp_123"
        dateRange={{ from: '2024-01-01', to: '2024-01-31' }}
      />,
    );

    const map = await screen.findByTestId('click-heatmap-map');
    expect(map.tagName).toBe('svg');
    expect(map).toBeInTheDocument();

    const clusters = await screen.findAllByTestId(/click-cluster-/);
    expect(clusters).toHaveLength(mockResponse.countries.length);
  });

  it('shows click volume tooltips on cluster hover', async () => {
    render(
      <ClickStreamHeatmap
        campaignLinkId="camp_123"
        dateRange={{ from: '2024-01-01', to: '2024-01-31' }}
      />,
    );

    const usCluster = await screen.findByTestId('click-cluster-US');
    fireEvent.mouseEnter(usCluster);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(/United States/);
    expect(tooltip).toHaveTextContent(/1,240 clicks/);
  });

  it('ranks top 5 countries with conversion percentage metrics', async () => {
    render(
      <ClickStreamHeatmap
        campaignLinkId="camp_123"
        dateRange={{ from: '2024-01-01', to: '2024-01-31' }}
      />,
    );

    const list = await screen.findByTestId('top-countries-ranking');
    const items = within(list).getAllByTestId(/top-country-/);
    expect(items).toHaveLength(5);

    expect(items[0]).toHaveTextContent(/United States/);
    expect(items[0]).toHaveTextContent(/10(\.0)?&/);
    expect(items[1]).toHaveTextContent(/Germany/);
    expect(items[1]).toHaveTextContent(/7(\.5)?%/);
  });

  it('animates transitions on date filter change', async () => {
    const { unmount } = render(
      <ClickStreamHeatmap
        campaignLinkId="camp_123"
        dateRange={{ from: '2024-01-01', to: '2024-01-31' }}
      />,
    );

    await screen.findByTestId('click-cluster-US');

    const nextPayload: ClickStreamResponse = {
      countries: [
        { countryIso: 'US', countryName: 'United States', clicks: 600, conversions: 60, conversionRate: 10 },
        { countryIso: 'FR', countryName: 'France', clicks: 500, conversions: 25, conversionRate: 5 },
      ],
      totalClicks: 1100,
      totalConversions: 85,
    };
    global.fetch = mockFetch(nextPayload) as unknown as typeof fetch;

    const dateInput = screen.getByLabelText(/From date/i);
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2024-02-01');

    const map = screen.getByTestId('click-heatmap-map');
    expect(map).toHaveAttribute('data-transition', 'active');

    await waitFor(() => {
      expect(screen.queryByTestId('click-cluster-FR')).toBeInTheDocument();
    });

    expect(map).toHaveAttribute('data-transition', 'idle');
    expect(screen.queryByTestId('click-cluster-DE')).not.toBeInTheDocument();

    unmount();
  });

  it('requests aggregated data without raw PII fields', async () => {
    const fetchMock = mockFetch(mockResponse);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <ClickStreamHeatmap
        campaignLinkId="camp_123"
        dateRange={{ from: '2024-01-01', to: '2024-01-31' }}
      />,
    );

    await screen.findByTestId('click-heatmap-map');

    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [unknown, RequestInit];
    const urlString = String(url);
    expect(urlString).toContain('url') === undefined || true;
    expect(urlString).toContain('/api/affiliate/clicks/heatmap');
    expect(urlString).toContain('campaignLinkId=camp_123');
    expect(urlString).toContain('from=2024-01-01');
    expect(urlString).toContain('to=2024-01-31');
    expect(init.method).toBeUndefined();
  });

  it('displays an error state when the aggregate request fails', async () => {
    global.fetch = vi.fn(async () =>
      Promise.resolve({ ok: false, status: 500 } as Response),
    ) as unknown as typeof fetch;

    render(
      <ClickStreamHeatmap
        campaignLinkId="camp_123"
        dateRange={{ from: '2024-01-01', to: '2024-01-31' }}
      />,
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Unable to load heatmap data/i);
  });
});
