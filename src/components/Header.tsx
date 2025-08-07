import React from 'react';
import { FileText, Zap } from 'lucide-react';
import { TokenizationConfig } from './TokenizationConfig';

export const Header: React.FC = () => {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Grant Filler</h1>
                <p className="text-sm text-gray-600">AI-Powered Grant Application Assistant</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <TokenizationConfig />
            <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
              <Zap className="w-4 h-4" />
              <span>Week 1: Core Pipeline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};