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
  <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-600'}`}>
      {icon || (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )}
    </div>
    <div className="space-y-1">
      <h4 className={`text-sm font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
      <p className={`text-xs leading-relaxed max-w-[220px] mx-auto ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{description}</p>
    </div>
  </div>
);

const Candlestick: React.FC<any> = (props) => {
  const { x, y, width, height, low, high, openClose } = props;
  if (openClose === undefined) return null;
  const isGrowing = openClose[1] > openClose[0];
  const color = isGrowing ? '#10b981' : '#ef4444';
  const ratio = Math.abs(height / (openClose[1] - openClose[0]));

  return (
    <g stroke={color} fill="none" strokeWidth="2">
      <path
        d={`
          M ${x},${y}
          L ${x},${y + height}
          L ${x + width},${y + height}
          L ${x + width},${y}
          L ${x},${y}
        `}
        fill={color}
        fillOpacity={0.8}
      />
      <path
        d={`
          M ${x + width / 2}, ${y + height + (low - Math.min(openClose[0], openClose[1])) * ratio}
          L ${x + width / 2}, ${y + height}
          M ${x + width / 2}, ${y}
          L ${x + width / 2}, ${y - (high - Math.max(openClose[0], openClose[1])) * ratio}
        `}
      />
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
      return { array: arr || [], fields: otherFields, arrayPath: arrayField.path };
    }

    const arrayEntry = Object.entries(data).find(([_, v]) => Array.isArray(v));
    if (arrayEntry) {
      const [key, arr] = arrayEntry;
      return { array: arr as any[], fields: config.selectedFields, arrayPath: key };
    }

    return { array: [], fields: config.selectedFields, arrayPath: '' };
  }, [data, config.selectedFields]);

  if (!data) return <div className={`p-8 text-center text-sm italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Loading real-time data...</div>;

  /* ---------------- CARD VIEW (FIXED FOR TWELVE DATA & COINBASE) ---------------- */
if (config.displayMode === DisplayMode.CARD) {
  // Determine the data source for card view
  let cardData = data;
  
  // If data has a 'values' array (Twelve Data format), use the first item
  if (data.values && Array.isArray(data.values) && data.values.length > 0) {
    cardData = data.values[0];
  }
  // If data is an array, use the first item
  else if (Array.isArray(data) && data.length > 0) {
    cardData = data[0];
  }
  // For Coinbase and other flat APIs, use data as-is
  else {
    cardData = data;
  }
  
  return (
    <div className="space-y-4 p-5">
      {config.selectedFields.map((field) => {
        let fieldValue;
        
        // For nested paths (like from arrays)
        if (field.path.includes('.')) {
          const pathParts = field.path.split('.');
          const actualKey = pathParts[pathParts.length - 1];
          fieldValue = cardData[actualKey] !== undefined ? cardData[actualKey] : getNestedValue(cardData, field.path);
        } else {
          // Direct field access (works for Coinbase flat structure)
          fieldValue = cardData[field.path];
        }
        
        return (
          <div key={field.path} className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {field.label}
            </span>
            <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatValue(fieldValue, field.format)}
            </span>
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
          title="No table data found"
          description="Please select an array field when testing the API."
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
        const aVal = getNestedValue(a, tableSortField.startsWith(arrayPath + '.') ? tableSortField.slice(arrayPath.length + 1) : tableSortField);
        const bVal = getNestedValue(b, tableSortField.startsWith(arrayPath + '.') ? tableSortField.slice(arrayPath.length + 1) : tableSortField);
        if (aVal === bVal) return 0;
        const result = aVal > bVal ? 1 : -1;
        return sortOrder === 'asc' ? result : -result;
      });
    }

    const totalPages = Math.ceil(processedRows.length / ROWS_PER_PAGE);
    const paginatedRows = processedRows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

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
      <div className="flex flex-col h-full overflow-hidden">
        <div className={`px-4 py-3 flex justify-between items-center border-b ${isDarkMode ? 'bg-[#161b22]/60 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
          <div className="relative w-full max-w-xs">
             <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
             </div>
             <input 
               type="text" 
               placeholder="Search table..."
               value={tableSearch}
               onChange={e => { setTableSearch(e.target.value); setPage(1); }}
               className={`w-full border rounded-md pl-9 pr-3 py-1.5 text-xs outline-none focus:border-emerald-500/50 ${isDarkMode ? 'bg-[#0d1117] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
             />
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{processedRows.length} items</span>
        </div>

        <div className={`flex-1 overflow-auto custom-scrollbar ${isDarkMode ? 'bg-[#0d1117]/30' : 'bg-white'}`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-10 border-b ${isDarkMode ? 'bg-[#1c2128] text-gray-400 border-white/5' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
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
                        <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
              {paginatedRows.map((item, idx) => (
                <tr key={idx} className={`transition-colors cursor-default ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  {columns.map(col => {
                    const relativePath = col.path.startsWith(arrayPath + '.') 
                      ? col.path.slice(arrayPath.length + 1) 
                      : col.path;
                    const val = getNestedValue(item, relativePath);
                    return (
                      <td key={col.path} className={`px-5 py-3 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
          <div className={`flex items-center justify-between px-4 py-3 border-t text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-[#161b22]/60 border-white/5 text-gray-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className={`px-3 py-1 rounded border transition-colors ${isDarkMode ? 'border-white/10 hover:bg-white/5 disabled:opacity-20' : 'border-gray-200 hover:bg-gray-100 disabled:opacity-30'}`}
            >
              Prev
            </button>
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className={`px-3 py-1 rounded border transition-colors ${isDarkMode ? 'border-white/10 hover:bg-white/5 disabled:opacity-20' : 'border-gray-200 hover:bg-gray-100 disabled:opacity-30'}`}
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
          description="Charts require at least one numeric field."
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>}
        />
      );
    }

    const sampleItem = array[0] || {};
    const availableKeys = Object.keys(sampleItem);
    
    let timeKey = availableKeys.find(k => k === 'time' || k === 'datetime') || availableKeys.find(k => 
      k.toLowerCase().includes('time') || 
      k.toLowerCase().includes('date') || 
      k.toLowerCase() === 'timestamp'
    ) || availableKeys[0];
    
    let valueKey = availableKeys.find(k => k === 'close') || availableKeys.find(k => 
      k !== timeKey && !isNaN(parseFloat(sampleItem[k])) &&
      (k.toLowerCase().includes('price') || k.toLowerCase().includes('close'))
    ) || availableKeys[1];

    let processedData = array.map((item, index) => {
      const yValue = parseFloat(item[valueKey]);
      const xValue = item[timeKey];
      return {
        time: xValue,
        value: isNaN(yValue) ? null : yValue,
        timestamp: typeof xValue === 'number' ? xValue : index
      };
    }).filter(item => item.value !== null).sort((a, b) => sortOrder === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp).slice(-100);

    const chartData = processedData.map((item) => ({
      ...item,
      displayTime: typeof item.time === 'number' && item.time > 1000000000
        ? new Date(item.time * (item.time > 10000000000 ? 1 : 1000)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : item.time
    }));

    return (
      <div className="flex flex-col h-full">
        <div className={`px-4 py-2 flex justify-between items-center border-b ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-gray-500 uppercase"
          >
            {sortOrder === 'asc' ? 'ASC' : 'DESC'}
          </button>
          <div className="flex items-center gap-1">
            {['1D', '1W', '1M', '1Y'].map((int) => (
              <button
                key={int}
                onClick={() => updateWidget({ ...config, interval: int as ChartInterval })}
                className={`px-2 py-1 text-[10px] font-bold rounded ${
                  (config.interval || '1D') === int ? 'bg-emerald-500 text-white' : 'text-gray-400'
                }`}
              >
                {int}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 w-full p-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#ffffff05" : "#00000008"} vertical={false} />
              <XAxis dataKey="displayTime" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} minTickGap={50} />
              <YAxis stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0d1117' : '#ffffff', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '6px', fontSize: '11px' }} />
              <Line type="monotone" dataKey="value" stroke="#00d09c" strokeWidth={2.5} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
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
          title="No candlestick data available"
          description="Requires OHLC (Open, High, Low, Close) fields."
        />
      );
    }

    const sampleItem = array[0] || {};
    const keys = Object.keys(sampleItem);
    
    let timeKey = keys.find(k => k === 'time' || k === 'datetime') || keys.find(k => k.toLowerCase().includes('time') || k.toLowerCase().includes('date')) || keys[0];
    let openKey = keys.find(k => k === 'open') || keys.find(k => k.toLowerCase() === 'open') || keys[1];
    let highKey = keys.find(k => k === 'high') || keys.find(k => k.toLowerCase() === 'high') || keys[2];
    let lowKey = keys.find(k => k === 'low') || keys.find(k => k.toLowerCase() === 'low') || keys[3];
    let closeKey = keys.find(k => k === 'close') || keys.find(k => k.toLowerCase() === 'close') || keys[4];

    const candlestickData = array.slice(0, 50).map(item => {
      const open = parseFloat(item[openKey]);
      const high = parseFloat(item[highKey]);
      const low = parseFloat(item[lowKey]);
      const close = parseFloat(item[closeKey]);
      const rawTime = item[timeKey];
      
      let formattedTime = rawTime;
      if (typeof rawTime === 'number' && rawTime > 1000000) {
        const date = new Date(rawTime * (rawTime > 10000000000 ? 1 : 1000));
        formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      
      return {
        time: formattedTime,
        open, high, low, close,
        openClose: [open, close],
        rawTime: typeof rawTime === 'number' ? rawTime : 0
      };
    }).filter(item => !isNaN(item.open)).sort((a, b) => sortOrder === 'asc' ? a.rawTime - b.rawTime : b.rawTime - a.rawTime);

    return (
      <div className="flex flex-col h-full">
        <div className={`px-4 py-2 flex justify-between items-center border-b ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-gray-500 uppercase"
          >
            {sortOrder === 'asc' ? 'ASC' : 'DESC'}
          </button>
          <div className="flex items-center gap-1">
            {['1D', '1W', '1M', '1Y'].map((int) => (
              <button
                key={int}
                onClick={() => updateWidget({ ...config, interval: int as ChartInterval })}
                className={`px-2 py-1 text-[10px] font-bold rounded ${
                  (config.interval || '1D') === int ? 'bg-emerald-500 text-white' : 'text-gray-400'
                }`}
              >
                {int}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full p-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candlestickData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#ffffff05" : "#00000008"} vertical={false} />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis 
                stroke="#6b7280" 
                fontSize={10} 
                axisLine={false} 
                tickLine={false} 
                domain={['auto', 'auto']} 
                padding={{ top: 20, bottom: 20 }}
              />
              <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0d1117' : '#ffffff', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '6px', fontSize: '11px' }} />
              <Bar dataKey="openClose" shape={<Candlestick />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return null;
};

export default WidgetRenderer;