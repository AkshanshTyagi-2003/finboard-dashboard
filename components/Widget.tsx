import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import { WidgetConfig } from '../types';
import { TrashIcon, RefreshIcon, SettingsIcon, DragIcon } from './Icons';
import WidgetRenderer from './WidgetRenderer';
import { getCachedData, setCachedData } from "../utils/cache";
import { universalFetcher } from '../api';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  config: WidgetConfig;
  onEdit: (config: WidgetConfig) => void;
}

const Widget: React.FC<Props> = ({ config, onEdit }) => {
  const { isDarkMode, removeWidget } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: config.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const fetchData = useCallback(async (isAutoRefresh = false) => {
    // Only show the global loading spinner if we don't have data yet
    if (!isAutoRefresh && data === null) setLoading(true);
    
    try {
      const cacheKey = config.apiUrl;
      
      // 1. Check cache for immediate display (only on first load)
      if (!data && !isAutoRefresh) {
        const cached = getCachedData(cacheKey);
        if (cached) {
          setData(cached);
          setLastUpdated(new Date());
          setLoading(false);
          // We DON'T return here; we continue to fetch fresh data
        }
      }

      // 2. Fetch fresh data from API
      const fetchedData = await universalFetcher(config.apiUrl);
      
      setData(fetchedData);
      setCachedData(cacheKey, fetchedData, config.refreshInterval);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error("Widget fetch error:", err);
      // Only show error if we have no data at all
      if (!data) setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [config.apiUrl, config.refreshInterval, data]);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(() => fetchData(true), config.refreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [fetchData, config.refreshInterval]);

  const cardClasses = isDarkMode ? 'bg-[#0d1117] border-white/5 shadow-2xl' : 'bg-white border-gray-200 shadow-sm hover:shadow-md';
  const headerClasses = isDarkMode ? 'bg-[#161b22]/40 border-white/5' : 'bg-gray-50 border-gray-100';
  const footerClasses = isDarkMode ? 'border-white/5 bg-[#0d1117]' : 'border-gray-100 bg-white';
  const textClasses = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClasses = isDarkMode ? 'text-gray-500' : 'text-gray-400';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`border rounded-xl overflow-hidden transition-all flex flex-col h-full group ${cardClasses} ${config.displayMode === 'TABLE' ? 'col-span-1 md:col-span-2 lg:col-span-full' : ''}`}
    >
      <div className={`px-5 py-3 border-b flex items-center justify-between backdrop-blur-sm ${headerClasses}`}>
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-2">
            <div {...listeners} className="cursor-grab active:cursor-grabbing">
              <DragIcon className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-700 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`} />
            </div>
            <h3 className={`text-[11px] font-bold uppercase tracking-wider truncate max-w-[180px] ${textClasses}`}>
              {config.name}
            </h3>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${isDarkMode ? 'bg-white/5 text-gray-500 border-white/5' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
            {config.refreshInterval}s
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => fetchData(false)} 
            disabled={loading}
            className={`p-1.5 rounded transition-all ${isDarkMode ? 'text-gray-500 hover:text-emerald-400 hover:bg-white/5' : 'text-gray-400 hover:text-emerald-600 hover:bg-gray-200/50'} disabled:opacity-50`}
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => onEdit(config)} className={`p-1.5 rounded transition-all ${isDarkMode ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200/50'}`}>
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => removeWidget(config.id)} className={`p-1.5 rounded transition-all ${isDarkMode ? 'text-gray-500 hover:text-red-400 hover:bg-white/5' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full text-center text-sm text-red-400 px-4">
            {error}
          </div>
        ) : (
          <WidgetRenderer data={data} config={config} />
        )}
      </div>

      <div className={`px-5 py-2.5 border-t flex justify-center ${footerClasses}`}>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${subTextClasses}`}>
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '---'}
        </span>
      </div>
    </div>
  );
};

export default Widget;