import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { ProcessingStatus } from './components/ProcessingStatus';
import { ExtractedContent } from './components/ExtractedContent';
import { UploadedFile, ExtractedDocument, ProcessingStatus as ProcessingStatusType } from './types';
import { DocumentExtractor } from './utils/textExtraction';

function App() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [processingStatuses, setProcessingStatuses] = useState<ProcessingStatusType[]>([]);
  const [extractedDocuments, setExtractedDocuments] = useState<ExtractedDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateProcessingStatus = useCallback((status: ProcessingStatusType) => {
    setProcessingStatuses(prev => {
      const existing = prev.find(s => s.id === status.id);
      if (existing) {
        return prev.map(s => s.id === status.id ? status : s);
      }
      return [...prev, status];
    });
  }, []);

  const processDocuments = useCallback(async (files: UploadedFile[]) => {
    if (files.length === 0) {
      setProcessingStatuses([]);
      setExtractedDocuments([]);
      return;
    }

    setIsProcessing(true);
    const extractor = DocumentExtractor.getInstance();
    const newDocuments: ExtractedDocument[] = [];

    for (const uploadedFile of files) {
      try {
        // Check if already processed
        const alreadyProcessed = extractedDocuments.find(
          doc => doc.fileName === uploadedFile.name && doc.fileType === uploadedFile.type
        );
        
        if (alreadyProcessed) {
          newDocuments.push(alreadyProcessed);
          continue;
        }

        const extractedDoc = await extractor.extractText(
          uploadedFile.file,
          updateProcessingStatus
        );
        
        newDocuments.push(extractedDoc);
      } catch (error) {
        console.error(`Failed to process ${uploadedFile.name}:`, error);
        updateProcessingStatus({
          id: uploadedFile.name,
          status: 'error',
          progress: 0,
          message: 'Processing failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setExtractedDocuments(newDocuments);
    setIsProcessing(false);
  }, [extractedDocuments, updateProcessingStatus]);

  const handleFilesSelected = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(files);
    processDocuments(files);
  }, [processDocuments]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Document Upload</h2>
              <FileUpload 
                onFilesSelected={handleFilesSelected}
                maxFiles={5}
                disabled={isProcessing}
              />
              
              {processingStatuses.length > 0 && (
                <div className="mt-8">
                  <ProcessingStatus statuses={processingStatuses} />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Extracted Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Extracted Content</h2>
                {extractedDocuments.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {extractedDocuments.reduce((total, doc) => total + doc.wordCount, 0).toLocaleString()} total words
                  </div>
                )}
              </div>
              
              <ExtractedContent documents={extractedDocuments} />
            </div>
          </div>
        </div>

        {/* Status Summary */}
        {extractedDocuments.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-900">Ready for Next Phase</h3>
                <p className="text-blue-700">
                  Successfully processed {extractedDocuments.length} document{extractedDocuments.length === 1 ? '' : 's'}. 
                  Ready to implement RAG pipeline and grant analysis features.
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((extractedDocuments.filter(doc => 
                    processingStatuses.find(status => 
                      status.id.includes(doc.fileName) && status.status === 'completed'
                    )
                  ).length / Math.max(extractedDocuments.length, 1)) * 100)}%
                </div>
                <div className="text-sm text-blue-600">Complete</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;