import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { WidgetConfig, DisplayMode, SelectedField } from '../types';
import { flattenKeys } from '../utils/data-utils';
import { PlusIcon, TrashIcon, RefreshIcon, LayoutIcon } from './Icons';
import { universalFetcher } from '../api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: WidgetConfig) => void;
  initialConfig?: WidgetConfig | null;
}

const FormatDropdown: React.FC<{
  value: string;
  onChange: (val: any) => void;
  isDarkMode: boolean;
}> = ({ value, onChange, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options = [
    { value: 'text', label: 'Text' },
    { value: 'currency', label: 'Currency' },
    { value: 'percentage', label: 'Percentage' },
    { value: 'number', label: 'Number' },
  ];

  const currentLabel = options.find(o => o.value === value)?.label || 'Text';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-40" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full text-[11px] border rounded px-3 py-2 outline-none cursor-pointer transition-all ${isDarkMode ? 'bg-[#1c2128] border-white/10 text-white hover:border-emerald-500/50' : 'bg-white border-gray-200 text-gray-900 hover:border-emerald-500/50'}`}
      >
        <span>{currentLabel}</span>
        <svg 
          className={`w-3 h-3 text-emerald-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {isOpen && (
        <div className={`absolute z-[100] w-full mt-1 border rounded-md shadow-2xl py-1 animate-in fade-in slide-in-from-top-1 duration-200 ${isDarkMode ? 'bg-[#1c2128] border-white/10' : 'bg-white border-gray-100'}`}>
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`px-3 py-2 text-[11px] cursor-pointer transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-white/5 hover:text-emerald-400' : 'text-gray-700 hover:bg-gray-100 hover:text-emerald-600'}`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AddWidgetModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialConfig }) => {
  const { isDarkMode } = useStore();
  const [name, setName] = useState(initialConfig?.name || '');
  const [url, setUrl] = useState(initialConfig?.apiUrl || '');
  const [interval, setInterval] = useState(initialConfig?.refreshInterval || 30);
  const [mode, setMode] = useState<DisplayMode>(initialConfig?.displayMode || DisplayMode.CARD);
  const [testData, setTestData] = useState<any>(null);
  const [availableFields, setAvailableFields] = useState<{path: string, value: any, isArray?: boolean}[]>([]);
  const [selectedFields, setSelectedFields] = useState<SelectedField[]>(initialConfig?.selectedFields || []);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArraysOnly, setShowArraysOnly] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialConfig) {
      setName(initialConfig.name);
      setUrl(initialConfig.apiUrl);
      setInterval(initialConfig.refreshInterval);
      setMode(initialConfig.displayMode);
      setSelectedFields(initialConfig.selectedFields);
    } else {
      setName('');
      setUrl('');
      setInterval(30);
      setMode(DisplayMode.CARD);
      setSelectedFields([]);
    }
    setTestData(null);
    setAvailableFields([]);
    setTestError(null);
    setExpandedFields(new Set());
  }, [initialConfig, isOpen]);

  const testConnection = async () => {
  if (!url) return;
  setTesting(true);
  setTestError(null);

  try {
    const data = await universalFetcher(url);
    setTestData(data);

    const fields = flattenKeys(
      Array.isArray(data) ? data[0] : data
    ).slice(0, 200); // hard limit for UI performance

    setAvailableFields(
      fields.map(f => ({
        ...f,
        isArray: Array.isArray(f.value)
      }))
    );
  } catch (e: any) {
    setTestError(e.message || "API failed");
  } finally {
    setTesting(false);
  }
};

  const addField = (path: string) => {
    if (!selectedFields.find(f => f.path === path)) {
      setSelectedFields([...selectedFields, { path, label: path.split('.').pop() || path }]);
    }
  };

  const removeField = (path: string) => {
    setSelectedFields(selectedFields.filter(f => f.path !== path));
  };

  const toggleExpand = (path: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleSave = () => {
    if (!name || !url || selectedFields.length === 0) {
      alert("Please enter a name, URL, and select at least one field.");
      return;
    }
    onSave({
      id: initialConfig?.id || Math.random().toString(36).substr(2, 9),
      name,
      apiUrl: url,
      refreshInterval: interval,
      displayMode: mode,
      selectedFields,
      createdAt: initialConfig?.createdAt || Date.now()
    });
    onClose();
  };

  if (!isOpen) return null;

  // Filter fields using the isArray flag
  const filteredFields = availableFields.filter(f => {
    const matchesSearch = f.path.toLowerCase().includes(searchQuery.toLowerCase());
    const isArrayField = f.isArray === true;
    
    if (showArraysOnly) {
      return matchesSearch && isArrayField;
    }
    return matchesSearch;
  });

  const modalClasses = isDarkMode ? 'bg-[#0d1117] border-white/10 text-[#e6edf3]' : 'bg-white border-gray-200 text-[#1f2328]';
  const labelClasses = isDarkMode ? 'text-gray-500' : 'text-gray-400';
  const inputClasses = isDarkMode ? 'bg-[#1c2128] border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500';
  const boxClasses = isDarkMode ? 'bg-[#161b22] border-white/5' : 'bg-gray-50 border-gray-200';
  const itemHoverClasses = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className={`border w-full max-w-2xl my-auto rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300 ${modalClasses}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-[#161b22] border-white/10' : 'bg-white border-gray-100'}`}>
          <h2 className="text-md font-bold tracking-tight">{initialConfig ? 'Edit Widget' : 'Add New Widget'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors p-1 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className={`text-[11px] font-bold uppercase tracking-wider ${labelClasses}`}>Widget Name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Bitcoin Price Tracker"
              className={`w-full border rounded-md px-4 py-2.5 text-sm outline-none transition-all ${inputClasses}`}
            />
          </div>

          <div className="space-y-2">
            <label className={`text-[11px] font-bold uppercase tracking-wider ${labelClasses}`}>API URL</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="e.g., https://api.twelvedata.com/time_series?symbol=AAPL&interval=1min&outputsize=30"
                className={`flex-1 border rounded-md px-4 py-2.5 text-sm outline-none transition-all ${inputClasses}`}
              />
              <button 
                onClick={testConnection}
                disabled={testing || !url}
                className={`px-5 py-2.5 text-white text-xs font-bold rounded-md transition-all flex items-center gap-2 border active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-emerald-700 hover:bg-emerald-600 border-white/5' : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-400 shadow-sm'}`}
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                Test
              </button>
            </div>
            {testError && <p className="text-[10px] text-red-400 mt-1 font-medium bg-red-400/5 p-2 rounded border border-red-400/10">Error: {testError}</p>}
            {testData && !testError && (
              <div className={`flex items-center gap-2 px-3 py-2 border rounded-md mt-2 ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-[11px] font-bold tracking-tight">
                  API connection successful! {availableFields.length} fields found 
                  ({availableFields.filter(f => f.isArray === true).length} arrays)
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className={`text-[11px] font-bold uppercase tracking-wider ${labelClasses}`}>Refresh Interval (seconds)</label>
            <input 
              type="number" 
              value={interval}
              onChange={e => setInterval(Number(e.target.value))}
              className={`w-full border rounded-md px-4 py-2.5 text-sm outline-none transition-all ${inputClasses}`}
            />
          </div>

          {testData && (
            <div className="pt-4 border-t border-gray-100/10 dark:border-white/5 space-y-6 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className={`text-[11px] font-bold uppercase tracking-wider ${labelClasses}`}>Display Mode</label>
                <div className={`flex gap-2 p-1 rounded-lg border ${boxClasses}`}>
                  {[
                    { mode: DisplayMode.CARD, icon: <LayoutIcon className="w-3.5 h-3.5" />, label: 'Card' },
                    { mode: DisplayMode.TABLE, icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>, label: 'Table' },
                    { mode: DisplayMode.CHART, icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>, label: 'Chart' },
                    { mode: DisplayMode.CANDLESTICK, icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, label: 'Candle' }
                  ].map(item => (
                    <button
                      key={item.mode}
                      onClick={() => setMode(item.mode)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-[11px] font-bold transition-all border cursor-pointer ${mode === item.mode ? (isDarkMode ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-emerald-500 border-emerald-400 text-white shadow-sm') : 'bg-transparent border-transparent text-gray-500 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                   <label className={`text-[11px] font-bold uppercase tracking-wider ${labelClasses}`}>Search Fields</label>
                   <input 
                     type="text"
                     placeholder="Search for fields..."
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     className={`w-full border rounded-md px-4 py-2.5 text-xs outline-none ${inputClasses}`}
                   />
                </div>
                
                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={showArraysOnly} 
                      onChange={e => setShowArraysOnly(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-8 h-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 ${isDarkMode ? 'bg-[#2d333b]' : 'bg-gray-300'}`}></div>
                  </div>
                  <span className={`text-[11px] font-bold transition-colors ${labelClasses} group-hover:text-emerald-500`}>Show arrays only (for table view)</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className={`text-[11px] font-bold uppercase tracking-wider ${labelClasses}`}>
                  Available Fields 
                  <span className="ml-2 text-emerald-500">
                    ({filteredFields.length} {showArraysOnly ? 'arrays' : 'total'})
                  </span>
                </label>
                <div className={`border rounded-md max-h-48 overflow-y-auto p-1 custom-scrollbar ${isDarkMode ? 'bg-[#161b22] border-white/10' : 'bg-white border-gray-100'}`}>
                  {filteredFields.length > 0 ? filteredFields.map(field => {
                    const isArray = field.isArray === true;
                    const displayValue = isArray 
                      ? field.value 
                      : String(field.value).substring(0, 60);
                    
                    return (
                      <div 
                        key={field.path} 
                        onClick={() => addField(field.path)}
                        className={`flex items-center justify-between px-3 py-2 rounded transition-colors group cursor-pointer ${itemHoverClasses}`}
                      >
                        <div className="truncate pr-4">
                          <p className={`text-[11px] font-mono truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {field.path} 
                            {isArray && <span className="ml-2 text-emerald-500 font-bold">📊 TABLE</span>}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate italic">{displayValue}</p>
                        </div>
                        <div className={`p-1.5 transition-colors rounded ${isDarkMode ? 'text-gray-500 group-hover:text-emerald-400 bg-white/5' : 'text-gray-400 group-hover:text-emerald-600 bg-gray-50'}`}>
                          <PlusIcon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-8 text-center">
                      <p className="text-[11px] text-gray-400 italic">No matching fields found</p>
                      <p className="text-[9px] text-gray-500 mt-1">
                        {showArraysOnly 
                          ? `No arrays detected. Total fields: ${availableFields.length}` 
                          : "Try testing the API connection"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-[11px] font-bold uppercase tracking-wider ${labelClasses}`}>Selected Fields ({selectedFields.length})</label>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar pb-32">
                  {selectedFields.map((field, idx) => {
                    const isExpanded = expandedFields.has(field.path);
                    return (
                      <div 
                        key={field.path} 
                        style={{ zIndex: isExpanded ? 50 : selectedFields.length - idx }}
                        className={`relative flex flex-col border rounded-md transition-all ${isDarkMode ? 'bg-[#1c2128] border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}
                      >
                        <div 
                          className={`flex items-center justify-between p-3 cursor-pointer select-none transition-colors rounded-md ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                          onClick={() => toggleExpand(field.path)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                               <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                               </svg>
                            </span>
                            <span className="text-[11px] font-mono text-emerald-400 font-bold truncate max-w-[200px]">{field.path}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>{field.label}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removeField(field.path); }} className="text-gray-500 hover:text-red-500 p-1 cursor-pointer transition-colors">
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        {isExpanded && (
                          <div className={`p-4 space-y-3 border-t animate-in slide-in-from-top-1 duration-200 ${isDarkMode ? 'bg-[#0d1117] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex gap-3">
                              <div className="flex-1 space-y-1">
                                <label className={`text-[9px] font-bold uppercase tracking-widest ${labelClasses}`}>Display Label</label>
                                <input 
                                  type="text" 
                                  value={field.label}
                                  onChange={e => setSelectedFields(selectedFields.map(sf => sf.path === field.path ? {...sf, label: e.target.value} : sf))}
                                  placeholder="Display Label"
                                  className={`w-full text-[11px] border rounded px-3 py-2 outline-none focus:border-emerald-500/50 ${inputClasses}`}
                                />
                              </div>
                              <div className="w-40 space-y-1">
                                <label className={`text-[9px] font-bold uppercase tracking-widest ${labelClasses}`}>Format Type</label>
                                <FormatDropdown 
                                  value={field.format || 'text'} 
                                  isDarkMode={isDarkMode} 
                                  onChange={val => setSelectedFields(selectedFields.map(sf => sf.path === field.path ? {...sf, format: val} : sf))}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selectedFields.length === 0 && (
                    <div className={`text-center py-6 border-2 border-dashed rounded-md text-[11px] italic ${isDarkMode ? 'border-white/5 text-gray-600' : 'border-gray-100 text-gray-400'}`}>
                      Select fields from Available Fields to add them here
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`px-6 py-4 border-t flex justify-end gap-3 rounded-b-xl ${isDarkMode ? 'bg-[#161b22] border-white/10' : 'bg-gray-50 border-gray-100'}`}>
          <button onClick={onClose} className="px-5 py-2 text-xs font-bold text-gray-500 hover:text-emerald-500 transition-colors cursor-pointer">Cancel</button>
          <button 
            onClick={handleSave} 
            className={`px-8 py-2.5 text-white text-xs font-bold rounded-md transition-all active:scale-95 shadow-xl cursor-pointer ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/10' : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/10'}`}
          >
            {initialConfig ? 'Update Widget' : 'Add Widget'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddWidgetModal;