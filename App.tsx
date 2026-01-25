import React, { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import Widget from './components/Widget';
import AddWidgetModal from './components/AddWidgetModal';
import { PlusIcon, LayoutIcon, SunIcon, MoonIcon } from './components/Icons';
import { WidgetConfig } from './types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';

const App: React.FC = () => {
  const {
    widgets,
    addWidget,
    updateWidget,
    isDarkMode,
    toggleTheme,
    importConfig,
    reorderWidgets
  } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      document.body.classList.remove('light-theme-scroll');
    } else {
      document.body.classList.remove('dark');
      document.body.classList.add('light-theme-scroll');
    }
  }, [isDarkMode]);

  const handleAddWidget = (config: WidgetConfig) => {
    if (editingWidget) {
      updateWidget(config);
    } else {
      addWidget(config);
    }
    setEditingWidget(null);
  };

  const handleEditWidget = (config: WidgetConfig) => {
    setEditingWidget(config);
    setIsModalOpen(true);
  };

  const exportConfig = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(widgets, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'finboard_config.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!Array.isArray(parsed)) {
          alert('Invalid configuration file');
          return;
        }
        importConfig(parsed);
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      
      reorderWidgets(oldIndex, newIndex);
    }
  };

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        isDarkMode
          ? 'bg-[#0d1117] text-[#e6edf3]'
          : 'bg-[#f6f8fa] text-[#1f2328]'
      }`}
    >
      <nav
        className={`sticky top-0 z-40 px-6 py-4 border-b backdrop-blur-xl ${
          isDarkMode
            ? 'bg-[#161b22]/80 border-white/5'
            : 'bg-white/80 border-gray-200 shadow-sm'
        }`}
      >
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg shadow-lg ${
                isDarkMode
                  ? 'bg-emerald-600 shadow-emerald-600/20'
                  : 'bg-emerald-500 shadow-emerald-500/10'
              }`}
            >
              <LayoutIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1
                className={`text-xl font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Finance Dashboard
              </h1>
              <p
                className={`text-[10px] font-medium uppercase tracking-widest -mt-1 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                Real-time data synchronization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all border cursor-pointer ${
                isDarkMode
                  ? 'border-white/10 hover:bg-white/5 text-gray-400 hover:text-white'
                  : 'border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>

            <button
              onClick={exportConfig}
              className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border rounded-lg cursor-pointer ${
                isDarkMode
                  ? 'text-gray-400 border-white/5 hover:text-white hover:bg-white/5'
                  : 'text-gray-500 border-gray-200 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Export
            </button>

            <button
              onClick={handleImportClick}
              className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border rounded-lg cursor-pointer ${
                isDarkMode
                  ? 'text-gray-400 border-white/5 hover:text-white hover:bg-white/5'
                  : 'text-gray-500 border-gray-200 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Import
            </button>

            <button
              onClick={() => {
                setEditingWidget(null);
                setIsModalOpen(true);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 active:scale-95 shadow-lg cursor-pointer ${
                isDarkMode
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'
              }`}
            >
              <PlusIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Add Widget</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-10 pb-20">
        {widgets.length === 0 ? (
          <div className="mt-20 flex flex-col items-center justify-center text-center space-y-8 max-w-lg mx-auto">
            <div className="relative">
              <div
                className={`absolute inset-0 blur-3xl opacity-20 ${
                  isDarkMode ? 'bg-emerald-500' : 'bg-emerald-400'
                }`}
              ></div>
              <div
                className={`relative p-8 border rounded-full ${
                  isDarkMode
                    ? 'bg-[#1c2128] border-white/10'
                    : 'bg-white border-gray-200 shadow-xl'
                }`}
              >
                <LayoutIcon
                  className={`w-20 h-20 opacity-80 ${
                    isDarkMode ? 'text-emerald-500' : 'text-emerald-500'
                  }`}
                />
              </div>
            </div>
            <div className="space-y-3">
              <h2
                className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Build Your Finance Dashboard
              </h2>
              <p
                className={`${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                } text-lg leading-relaxed`}
              >
                Create custom widgets by connecting to any finance API. Track
                stocks, crypto, forex, or economic indicators — all in real-time.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className={`px-10 py-4 text-white text-lg font-bold rounded-2xl shadow-2xl transition-all transform hover:scale-105 cursor-pointer ${
                isDarkMode
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/40'
                  : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30'
              }`}
            >
              Get Started Now
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgets.map(w => w.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-700">
                {widgets.map((widget) => (
                  <Widget
                    key={widget.id}
                    config={widget}
                    onEdit={handleEditWidget}
                  />
                ))}

                <button
                  onClick={() => {
                    setEditingWidget(null);
                    setIsModalOpen(true);
                  }}
                  className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 gap-4 transition-all group min-h-[300px] cursor-pointer ${
                    isDarkMode
                      ? 'border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5'
                      : 'border-gray-200 hover:border-emerald-500/50 hover:bg-emerald-50/50'
                  }`}
                >
                  <div
                    className={`p-4 rounded-full transition-colors ${
                      isDarkMode
                        ? 'bg-white/5 group-hover:bg-emerald-500/10'
                        : 'bg-gray-100 group-hover:bg-emerald-100'
                    }`}
                  >
                    <PlusIcon
                      className={`w-8 h-8 transition-colors ${
                        isDarkMode
                          ? 'text-gray-500 group-hover:text-emerald-500'
                          : 'text-gray-400 group-hover:text-emerald-500'
                      }`}
                    />
                  </div>
                  <div className="text-center">
                    <p
                      className={`font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      Add Widget
                    </p>
                    <p
                      className={`text-xs ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      Connect to a finance API and create a custom widget
                    </p>
                  </div>
                </button>
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <AddWidgetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWidget(null);
        }}
        onSave={handleAddWidget}
        initialConfig={editingWidget}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={handleImportFile}
      />
    </div>
  );
};

export default App;