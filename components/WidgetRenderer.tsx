import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { DisplayMode, WidgetConfig, ChartInterval } from '../types';
import { getNestedValue, formatValue } from '../utils/data-utils';

interface Props {
  data: any;
  config: WidgetConfig;
}

const ROWS_PER_PAGE = 10;

const EmptyState: React.FC<{
  title: string;
  description: string;
  isDarkMode: boolean;
  icon?: React.ReactNode
}> = ({ title, description, isDarkMode, icon }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className={`mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
      {icon || (
        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
    </div>
    <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      {title}
    </h3>
    <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
      {description}
    </p>
  </div>
);

const Candlestick: React.FC<any> = (props) => {
  const { x, y, width, height, low, high, openClose } = props;
  
  if (openClose === undefined || !Array.isArray(openClose) || openClose.length < 2) return null;
  
  const isGrowing = openClose[1] > openClose[0];
  const color = isGrowing ? '#10b981' : '#ef4444';
  const ratio = Math.abs(height / (openClose[1] - openClose[0]));

  return (
    <g stroke={color} fill="none" strokeWidth="2">
      <path d={`M ${x},${y} L ${x},${y + height}`} />
      <path d={`M ${x - width / 2},${y + (openClose[0] - low) * ratio} L ${x + width / 2},${y + (openClose[0] - low) * ratio}`} />
      <rect x={x - width / 2} y={y} width={width} height={height} fill={color} />
    </g>
  );
};

const WidgetRenderer: React.FC<Props> = ({ data, config }) => {
  const { isDarkMode, updateWidget } = useStore();
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [tableSortField, setTableSortField] = useState<string | null>(null);

  const extractedData = useMemo(() => {
    if (!data) return { array: [], fields: config.selectedFields, arrayPath: '' };

    if (Array.isArray(data)) {
      return { array: data, fields: config.selectedFields, arrayPath: '' };
    }

    const arrayField = config.selectedFields.find(f => {
      const val = getNestedValue(data, f.path);
      return Array.isArray(val);
    });

    if (arrayField) {
      const arr = getNestedValue(data, arrayField.path);
      const otherFields = config.selectedFields.filter(f => f.path !== arrayField.path);
      return {
        array: Array.isArray(arr) ? arr : [],
        fields: otherFields,
        arrayPath: arrayField.path
      };
    }

    const arrayEntry = Object.entries(data).find(([_, v]) => Array.isArray(v));
    if (arrayEntry) {
      const [key, arr] = arrayEntry;
      return {
        array: Array.isArray(arr) ? arr : [],
        fields: config.selectedFields,
        arrayPath: key
      };
    }

    return { array: [], fields: config.selectedFields, arrayPath: '' };
  }, [data, config.selectedFields]);

  if (!data) return <div className="p-8 text-center text-gray-500">Loading real-time data...</div>;

  /* ---------------- CARD VIEW ---------------- */
  if (config.displayMode === DisplayMode.CARD) {
    let cardData = data;

    // Handle different API response structures
    if (data?.values && Array.isArray(data.values) && data.values.length > 0) {
      cardData = data.values[0];
    } else if (Array.isArray(data) && data.length > 0) {
      cardData = data[0];
    }

    return (
      <div className="grid grid-cols-2 gap-4 p-6">
        {config.selectedFields.map((field) => {
          let fieldValue;

          if (field.path.includes('.')) {
            const pathParts = field.path.split('.');
            const actualKey = pathParts[pathParts.length - 1];
            fieldValue = cardData?.[actualKey] !== undefined 
              ? cardData[actualKey] 
              : getNestedValue(cardData, field.path);
          } else {
            fieldValue = cardData?.[field.path];
          }

          return (
            <div key={field.path} className="text-center">
              <div className={`text-xs uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {field.label}
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatValue(fieldValue, field.format)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ---------------- TABLE VIEW ---------------- */
  if (config.displayMode === DisplayMode.TABLE) {
    const { array, fields, arrayPath } = extractedData;

    if (array.length === 0) {
      return (
        <EmptyState
          isDarkMode={isDarkMode}
          title="No table data available"
          description="Select an array field to display table data"
        />
      );
    }

    let processedRows = array.filter(item => {
      if (!tableSearch) return true;
      const searchStr = tableSearch.toLowerCase();
      return Object.values(item || {}).some(val =>
        String(val).toLowerCase().includes(searchStr)
      );
    });

    if (tableSortField) {
      processedRows = [...processedRows].sort((a, b) => {
        const aVal = getNestedValue(a, tableSortField.startsWith(arrayPath + '.') 
          ? tableSortField.slice(arrayPath.length + 1) 
          : tableSortField);
        const bVal = getNestedValue(b, tableSortField.startsWith(arrayPath + '.') 
          ? tableSortField.slice(arrayPath.length + 1) 
          : tableSortField);
        
        if (aVal === bVal) return 0;
        const result = aVal > bVal ? 1 : -1;
        return sortOrder === 'asc' ? result : -result;
      });
    }

    const totalPages = Math.ceil(processedRows.length / ROWS_PER_PAGE);
    const paginatedRows = processedRows.slice(
      (page - 1) * ROWS_PER_PAGE,
      page * ROWS_PER_PAGE
    );

    const columns = fields.length > 0
      ? fields
      : Object.keys(array[0] || {}).slice(0, 5).map(k => ({
          path: k,
          label: k,
          format: 'text' as const
        }));

    const handleTableSort = (path: string) => {
      if (tableSortField === path) {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setTableSortField(path);
        setSortOrder('asc');
      }
    };

    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search table..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setPage(1);
              }}
              className={`w-full border rounded-md pl-9 pr-3 py-1.5 text-xs outline-none focus:border-emerald-500/50 ${
                isDarkMode ? 'bg-[#0d1117] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}
            />
          </div>
          <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {processedRows.length} items
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#e5e7eb' }}>
          <table className="w-full text-xs">
            <thead className={isDarkMode ? 'bg-[#161b22]' : 'bg-gray-50'}>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.path}
                    onClick={() => handleTableSort(col.path)}
                    className="px-5 py-3 font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {col.label}
                      {tableSortField === col.path && (
                        <span className="text-emerald-500">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((item, idx) => (
                <tr
                  key={idx}
                  className={isDarkMode ? 'border-t border-white/5 hover:bg-white/[0.02]' : 'border-t border-gray-100 hover:bg-gray-50'}
                >
                  {columns.map(col => {
                    const relativePath = col.path.startsWith(arrayPath + '.')
                      ? col.path.slice(arrayPath.length + 1)
                      : col.path;
                    const val = getNestedValue(item, relativePath);
                    return (
                      <td key={col.path} className="px-5 py-3 whitespace-nowrap text-center">
                        {formatValue(val, col.format)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className={`px-3 py-1 rounded border transition-colors ${
                isDarkMode 
                  ? 'border-white/10 hover:bg-white/5 disabled:opacity-20' 
                  : 'border-gray-200 hover:bg-gray-100 disabled:opacity-30'
              }`}
            >
              Prev
            </button>
            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Page {page} of {totalPages}
            </div>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className={`px-3 py-1 rounded border transition-colors ${
                isDarkMode 
                  ? 'border-white/10 hover:bg-white/5 disabled:opacity-20' 
                  : 'border-gray-200 hover:bg-gray-100 disabled:opacity-30'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ---------------- CHART VIEW ---------------- */
  if (config.displayMode === DisplayMode.CHART) {
    const { array } = extractedData;

    if (array.length === 0) {
      return (
        <EmptyState
          isDarkMode={isDarkMode}
          title="No chart data available"
          description="Select fields with numeric data to display a chart"
          icon={
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      );
    }

    const sampleItem = array[0] || {};
    const availableKeys = Object.keys(sampleItem);

    let timeKey = availableKeys.find(k => k === 'time' || k === 'datetime')
      || availableKeys.find(k => 
        k.toLowerCase().includes('time') || 
        k.toLowerCase().includes('date') || 
        k.toLowerCase() === 'timestamp'
      )
      || availableKeys[0];

    let valueKey = availableKeys.find(k => k === 'close')
      || availableKeys.find(k => 
        k !== timeKey && 
        !isNaN(parseFloat(sampleItem[k])) &&
        (k.toLowerCase().includes('price') || k.toLowerCase().includes('close'))
      )
      || availableKeys[1];

    let processedData = array
      .map((item, index) => {
        const yValue = parseFloat(item?.[valueKey]);
        const xValue = item?.[timeKey];
        return {
          time: xValue,
          value: isNaN(yValue) ? null : yValue,
          timestamp: typeof xValue === 'number' ? xValue : index
        };
      })
      .filter(item => item.value !== null)
      .sort((a, b) => sortOrder === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp)
      .slice(-100);

    const chartData = processedData.map((item) => ({
      ...item,
      displayTime: typeof item.time === 'number' && item.time > 1000000000
        ? new Date(item.time * (item.time > 10000000000 ? 1 : 1000)).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        : item.time
    }));

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-gray-500 uppercase"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            {sortOrder === 'asc' ? 'ASC' : 'DESC'}
          </button>
          <div className="flex gap-1">
            {['1D', '1W', '1M', '1Y'].map((int) => (
              <button
                key={int}
                onClick={() => updateWidget({ ...config, interval: int as ChartInterval })}
                className={`px-2 py-1 text-[10px] font-bold rounded ${
                  (config.interval || '1D') === int
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-400'
                }`}
              >
                {int}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#30363d' : '#e5e7eb'} />
            <XAxis 
              dataKey="displayTime" 
              stroke={isDarkMode ? '#8b949e' : '#6b7280'} 
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              stroke={isDarkMode ? '#8b949e' : '#6b7280'} 
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? '#161b22' : '#fff',
                border: `1px solid ${isDarkMode ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '6px',
                fontSize: '11px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#10b981" 
              strokeWidth={2} 
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* ---------------- CANDLESTICK CHART VIEW ---------------- */
  if (config.displayMode === DisplayMode.CANDLESTICK) {
    const { array } = extractedData;

    if (array.length === 0) {
      return (
        <EmptyState
          isDarkMode={isDarkMode}
          title="No candlestick data"
          description="Requires open, high, low, close fields"
        />
      );
    }

    const sampleItem = array[0] || {};
    const keys = Object.keys(sampleItem);

    let timeKey = keys.find(k => k === 'time' || k === 'datetime')
      || keys.find(k => k.toLowerCase().includes('time') || k.toLowerCase().includes('date'))
      || keys[0];

    let openKey = keys.find(k => k === 'open') || keys.find(k => k.toLowerCase() === 'open') || keys[1];
    let highKey = keys.find(k => k === 'high') || keys.find(k => k.toLowerCase() === 'high') || keys[2];
    let lowKey = keys.find(k => k === 'low') || keys.find(k => k.toLowerCase() === 'low') || keys[3];
    let closeKey = keys.find(k => k === 'close') || keys.find(k => k.toLowerCase() === 'close') || keys[4];

    const candlestickData = array
      .slice(0, 50)
      .map(item => {
        const open = parseFloat(item?.[openKey]);
        const high = parseFloat(item?.[highKey]);
        const low = parseFloat(item?.[lowKey]);
        const close = parseFloat(item?.[closeKey]);
        const rawTime = item?.[timeKey];

        let formattedTime = rawTime;
        if (typeof rawTime === 'number' && rawTime > 1000000) {
          const date = new Date(rawTime * (rawTime > 10000000000 ? 1 : 1000));
          formattedTime = date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        }

        return {
          time: formattedTime,
          open,
          high,
          low,
          close,
          openClose: [open, close],
          rawTime: typeof rawTime === 'number' ? rawTime : 0
        };
      })
      .filter(item => !isNaN(item.open))
      .sort((a, b) => sortOrder === 'asc' ? a.rawTime - b.rawTime : b.rawTime - a.rawTime);

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-gray-500 uppercase"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            {sortOrder === 'asc' ? 'ASC' : 'DESC'}
          </button>
          <div className="flex gap-1">
            {['1D', '1W', '1M', '1Y'].map((int) => (
              <button
                key={int}
                onClick={() => updateWidget({ ...config, interval: int as ChartInterval })}
                className={`px-2 py-1 text-[10px] font-bold rounded ${
                  (config.interval || '1D') === int
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-400'
                }`}
              >
                {int}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={candlestickData}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#30363d' : '#e5e7eb'} />
            <XAxis 
              dataKey="time" 
              stroke={isDarkMode ? '#8b949e' : '#6b7280'} 
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              domain={['dataMin', 'dataMax']} 
              stroke={isDarkMode ? '#8b949e' : '#6b7280'} 
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? '#161b22' : '#fff',
                border: `1px solid ${isDarkMode ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '6px',
                fontSize: '11px'
              }}
            />
            <Bar 
              dataKey="openClose" 
              fill="#8884d8" 
              shape={<Candlestick />}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
};

export default WidgetRenderer;