export enum DisplayMode {
  CARD = 'CARD',
  TABLE = 'TABLE',
  CHART = 'CHART',
  CANDLESTICK = 'CANDLESTICK'
}

// Define the available intervals
export type ChartInterval = '1D' | '1W' | '1M' | '1Y';

export interface SelectedField {
  path: string;
  label: string;
  format?: 'currency' | 'percentage' | 'number' | 'text';
}

export interface WidgetConfig {
  id: string;
  name: string;
  apiUrl: string;
  refreshInterval: number; // in seconds
  displayMode: DisplayMode;
  selectedFields: SelectedField[];
  createdAt: number;
  interval?: ChartInterval; // Added to store current selection
}

export interface DashboardState {
  widgets: WidgetConfig[];
  isDarkMode: boolean;
}

export interface ApiCache {
  [url: string]: {
    data: any;
    timestamp: number;
  };
}