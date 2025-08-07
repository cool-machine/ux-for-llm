import React, { useState } from 'react';
import { FileText, Download, Search, Copy, Check, Wand2 } from 'lucide-react';
import { ExtractedDocument } from '../types';

interface ExtractedContentProps {
  documents: ExtractedDocument[];
}

export const ExtractedContent: React.FC<ExtractedContentProps> = ({ documents }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'original' | 'preprocessed' | 'tokenized'>('original');
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  const filteredDocuments = documents.filter(doc =>
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.extractedText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  const downloadExtractedText = (doc: ExtractedDocument) => {
    const element = document.createElement('a');
    let textToDownload: string;
    let filename: string;
    
    if (viewMode === 'preprocessed' && doc.tokenizedData?.tokenIds.length) {
      textToDownload = JSON.stringify(doc.tokenizedData.tokenIds);
      filename = `${doc.fileName}_token_ids.json`;
    } else if (viewMode === 'tokenized' && doc.tokenizedData?.tokens.length) {
      textToDownload = doc.tokenizedData.tokens.join(' ');
      filename = `${doc.fileName}_tokens.txt`;
    } else if (doc.preprocessedText) {
      textToDownload = doc.preprocessedText;
      filename = `${doc.fileName}_original.txt`;
    } else {
      textToDownload = doc.extractedText;
      filename = `${doc.fileName}_original.txt`;
    }
    
    const file = new Blob([textToDownload], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = async (text: string, docId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [docId]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [docId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const getTextToCopy = (doc: ExtractedDocument): string => {
    if (viewMode === 'preprocessed' && doc.tokenizedData?.tokenIds.length) {
      // Token IDs: Return numerical token IDs as JSON array
      return JSON.stringify(doc.tokenizedData.tokenIds);
    } else if (viewMode === 'tokenized' && doc.tokenizedData?.tokens.length) {
      // Tokens: Return actual tokens as space-separated text
      return doc.tokenizedData.tokens.join(' ');
    } else {
      // Original: Return original extracted text
      return doc.extractedText;
    }
  };
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Processed</h3>
        <p className="text-gray-600">Upload and process documents to see extracted content here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search extracted content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <Wand2 className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Text View:</span>
        </div>
        <div className="flex bg-white rounded-md border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode('original')}
            className={`px-3 py-1 text-sm font-medium rounded-l-md transition-colors ${
              viewMode === 'original'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setViewMode('preprocessed')}
            className={`px-3 py-1 text-sm font-medium transition-colors border-l border-gray-200 ${
              viewMode === 'preprocessed'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Token IDs
          </button>
          <button
            onClick={() => setViewMode('tokenized')}
            className={`px-3 py-1 text-sm font-medium transition-colors border-l border-gray-200 ${
              viewMode === 'tokenized'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Tokens
          </button>
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-4">
        {filteredDocuments.map((doc) => (
          <div key={doc.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Document Header */}
            <div 
              className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setSelectedDocument(selectedDocument === doc.id ? null : doc.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <div>
                    <h4 className="font-medium text-gray-900">{doc.fileName}</h4>
                    <p className="text-sm text-gray-500">
                      {doc.extractedText.length.toLocaleString()} characters
                      {doc.tokenizedData && ` • ${doc.tokenizedData.tokenCount.toLocaleString()} tokens`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(getTextToCopy(doc), doc.id);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedStates[doc.id] ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadExtractedText(doc);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download extracted text"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {selectedDocument === doc.id && (
              <div className="p-4">
                {/* Preprocessing Stats */}
                {(viewMode === 'preprocessed' || viewMode === 'tokenized') && doc.metadata?.preprocessingStats && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="text-sm font-medium text-blue-900 mb-2">Preprocessing Statistics</h5>
                    <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
                      <div>
                        <span className="font-medium">Word Count:</span> {doc.metadata.preprocessingStats.processedWordCount.toLocaleString()} 
                        <span className="text-blue-500"> (was {doc.metadata.preprocessingStats.originalWordCount.toLocaleString()})</span>
                      </div>
                      <div>
                        <span className="font-medium">Structure:</span> {Math.round(doc.metadata.preprocessingStats.structureImprovement * 100)}% improvement
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Tokenization Stats */}
                {viewMode === 'tokenized' && doc.tokenizedData && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <h5 className="text-sm font-medium text-green-900 mb-2">Tokenization Statistics</h5>
                    <div className="grid grid-cols-2 gap-4 text-xs text-green-700">
                      <div>
                        <span className="font-medium">Token Count:</span> {doc.tokenizedData.tokenCount.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Model:</span> {doc.tokenizedData.modelName}
                      </div>
                      <div>
                        <span className="font-medium">Tokenized:</span> {doc.tokenizedData.tokenizedAt.toLocaleTimeString()}
                      </div>
                      <div>
                        <span className="font-medium">Token IDs:</span> {doc.tokenizedData.tokenIds.length > 0 ? 'Available' : 'Not available'}
                      </div>
                    </div>
                  </div>
                )}
                
                {viewMode === 'preprocessed' && doc.tokenizedData?.tokenIds.length ? (
                  <div>
                    <h6 className="text-sm font-medium text-gray-900 mb-2">
                      Token IDs ({doc.tokenizedData.tokenIds.length}) - Ready for LLM Processing
                    </h6>
                    <div className="text-xs text-gray-600 font-mono bg-gray-100 p-3 rounded max-h-80 overflow-y-auto">
                      [{doc.tokenizedData.tokenIds.join(', ')}]
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      These numerical token IDs can be directly fed into GPT-2 or other transformer models.
                    </p>
                  </div>
                ) : viewMode === 'tokenized' && doc.tokenizedData?.tokens.length ? (
                  <div>
                    <h6 className="text-sm font-medium text-gray-900 mb-2">
                      Tokens ({doc.tokenizedData.tokens.length}) - Words & Subwords
                    </h6>
                    <div className="flex flex-wrap gap-1 max-h-80 overflow-y-auto">
                      {doc.tokenizedData.tokens.map((token, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border"
                          title={`Token ${index}: "${token}"${doc.tokenizedData?.tokenIds[index] ? ` (ID: ${doc.tokenizedData.tokenIds[index]})` : ''}`}
                        >
                          {token}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      These are the actual tokens (words and subwords) that the tokenizer generated.
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div 
                      className="text-sm text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: highlightText(getTextToCopy(doc), searchTerm)
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredDocuments.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
          <p className="text-gray-600">
            No documents match your search for "{searchTerm}"
          </p>
        </div>
      )}
    </div>
  );
};