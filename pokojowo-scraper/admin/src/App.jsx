import { useState, useEffect } from 'react';
import { scraperApi } from './services/api';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import ConnectionStatus from './components/ConnectionStatus';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      await scraperApi.healthCheck();
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ConnectionStatus isConnected={isConnected} isLoading={isLoading} />
      <main className="container mx-auto px-4 py-6">
        {isConnected ? (
          <Dashboard />
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Scraper Backend Not Connected
              </h2>
              <p className="text-gray-500 mb-4">
                Make sure the scraper backend is running on port 8001
              </p>
              <code className="bg-gray-100 px-4 py-2 rounded text-sm">
                cd pokojowo-scraper && source venv/bin/activate && uvicorn src.api.app:app --port 8001
              </code>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
