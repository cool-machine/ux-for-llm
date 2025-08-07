import React from 'react';
import { CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { ProcessingStatus as ProcessingStatusType } from '../types';

interface ProcessingStatusProps {
  statuses: ProcessingStatusType[];
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ statuses }) => {
  if (statuses.length === 0) return null;

  const getStatusIcon = (status: ProcessingStatusType['status']) => {
    switch (status) {
      case 'uploading':
      case 'extracting':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ProcessingStatusType['status']) => {
    switch (status) {
      case 'uploading':
      case 'extracting':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getProgressColor = (status: ProcessingStatusType['status']) => {
    switch (status) {
      case 'uploading':
      case 'extracting':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Processing Status</h3>
      
      {statuses.map((status) => (
        <div
          key={status.id}
          className={`p-4 rounded-lg border ${getStatusColor(status.status)}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              {getStatusIcon(status.status)}
              <div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {status.id}
                </p>
                <p className="text-xs text-gray-600">{status.message}</p>
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(status.progress)}%
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(status.status)}`}
              style={{ width: `${Math.min(status.progress, 100)}%` }}
            ></div>
          </div>
          
          {/* Error Message */}
          {status.error && (
            <div className="mt-3 p-2 bg-red-100 rounded text-sm text-red-700">
              <strong>Error:</strong> {status.error}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};