import React, { useState, useEffect } from 'react';
import { Settings, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { TokenizationService } from '../utils/tokenization';
import { TokenizationConfigType } from '../types';

export const TokenizationConfig: React.FC = () => {
  const [config, setConfig] = useState<TokenizationConfigType>({
    modelName: 'gpt2',
    azureFunctionUrl: '',
    apiKey: ''
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    // Load current configuration
    const tokenizer = TokenizationService.getInstance();
    setConfig(tokenizer.getConfig());
  }, []);

  const handleSave = () => {
    const tokenizer = TokenizationService.getInstance();
    tokenizer.updateConfig(config);
    setIsOpen(false);
    setTestResult(null);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestMessage('');

    try {
      // Temporarily update config for testing
      const tokenizer = TokenizationService.getInstance();
      tokenizer.updateConfig(config);
      
      const success = await tokenizer.testConnection();
      
      if (success) {
        setTestResult('success');
        setTestMessage('Connection successful! Tokenizer is ready to use.');
      } else {
        setTestResult('error');
        setTestMessage('Connection failed. Please check your configuration.');
      }
    } catch (error) {
      setTestResult('error');
      setTestMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    setConfig({
      modelName: 'gpt2',
      azureFunctionUrl: '',
      apiKey: ''
    });
    setTestResult(null);
    setTestMessage('');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Configure tokenization settings"
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span>Tokenizer Config</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Tokenization Configuration</h3>
            <p className="text-sm text-gray-600 mt-1">
              Your Azure Function is public and doesn't require authentication
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Model Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={config.modelName}
                onChange={(e) => setConfig(prev => ({ ...prev, modelName: e.target.value }))}
                placeholder="e.g., gpt2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Hugging Face model name for tokenization
              </p>
            </div>

            {/* Azure Function URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Azure Function URL
              </label>
              <input
                type="url"
                value={config.azureFunctionUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, azureFunctionUrl: e.target.value }))}
                placeholder="https://your-function-app.azurewebsites.net/api/tokenize"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your Azure Function endpoint URL
              </p>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key (Optional)
              </label>
              <input
                type="password"
                value={config.apiKey || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Enter API key if required"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Authentication key for your Azure Function
              </p>
            </div>

            {/* Test Connection */}
            <div className="pt-2">
              <button
                onClick={handleTest}
                disabled={isTesting || !config.azureFunctionUrl}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>

              {testResult && (
                <div className={`mt-2 p-2 rounded-md text-sm flex items-start space-x-2 ${
                  testResult === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {testResult === 'success' ? (
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <span>{testMessage}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-between">
            <button
              onClick={handleReset}
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              Reset
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};