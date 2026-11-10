import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { LiveSimulationPage } from './pages/LiveSimulationPage';
import { TrainingPage } from './pages/TrainingPage';
import { AlgorithmLabPage } from './pages/AlgorithmLabPage';
import { MdpExplorerPage } from './pages/MdpExplorerPage';
import { BellmanSimulatorPage } from './pages/BellmanSimulatorPage';
import { PolicyValuePage } from './pages/PolicyValuePage';
import { ComparisonPage } from './pages/ComparisonPage';
import { ExperimentsPage } from './pages/ExperimentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Scenario, Experiment } from './types';
import { fetchScenarios, fetchExperiments, fetchTrainingStatus } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [isTraining, setIsTraining] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [sc, exp, tr] = await Promise.all([
        fetchScenarios(),
        fetchExperiments(),
        fetchTrainingStatus(),
      ]);
      setScenarios(sc);
      setExperiments(exp);
      setIsTraining(tr.is_training);
    } catch (err) {
      console.error('Failed to load initial data', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isTraining={isTraining}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && (
          <OverviewPage onNavigate={setActiveTab} experiments={experiments} />
        )}
        {activeTab === 'simulation' && (
          <LiveSimulationPage scenarios={scenarios} />
        )}
        {activeTab === 'training' && (
          <TrainingPage scenarios={scenarios} />
        )}
        {activeTab === 'laboratory' && (
          <AlgorithmLabPage />
        )}
        {activeTab === 'mdp' && (
          <MdpExplorerPage />
        )}
        {activeTab === 'bellman' && (
          <BellmanSimulatorPage />
        )}
        {activeTab === 'policy-value' && (
          <PolicyValuePage />
        )}
        {activeTab === 'comparison' && (
          <ComparisonPage scenarios={scenarios} />
        )}
        {activeTab === 'experiments' && (
          <ExperimentsPage experiments={experiments} onRefresh={loadData} />
        )}
        {activeTab === 'settings' && (
          <SettingsPage />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-6 bg-[#080B13] text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            Intelligent Traffic Signal Optimization Using Reinforcement Learning
          </div>
          <div className="flex items-center gap-3">
            <span>FastAPI Backend</span>
            <span>•</span>
            <span>PyTorch & Tabular Q-Learning</span>
            <span>•</span>
            <span>React + Vite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
