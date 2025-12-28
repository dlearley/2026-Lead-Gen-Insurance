'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { customerPortalService } from '../../../services/customer-portal.service';
import type { CustomerDocument } from '@insurance/types';
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
} from 'lucide-react';

export default function CustomerDocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [fileData, setFileData] = useState({
    fileName: '',
    fileData: '',
    documentType: 'other',
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const result = await customerPortalService.getDocuments();
      setDocuments(result.documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFileData({
          fileName: file.name,
          fileData: reader.result as string,
          documentType: fileData.documentType,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileData.fileName || !fileData.fileData) {
      return;
    }

    setUploading(true);

    try {
      await customerPortalService.uploadDocument({
        fileName: fileData.fileName,
        fileData: fileData.fileData,
        mimeType: 'application/octet-stream',
        documentType: fileData.documentType as any,
      });
      setShowUploadForm(false);
      setFileData({ fileName: '', fileData: '', documentType: 'other' });
      loadDocuments();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await customerPortalService.deleteDocument(documentId);
      loadDocuments();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete document');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      id_proof: 'ID Proof',
      income: 'Income Verification',
      address: 'Address Proof',
      insurance_card: 'Insurance Card',
      other: 'Other',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/portal/dashboard"
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Upload Document
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Form */}
        {showUploadForm && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Upload New Document</h2>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                  Select File
                </label>
                <input
                  type="file"
                  id="file"
                  onChange={handleFileChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="documentType" className="block text-sm font-medium text-gray-700">
                  Document Type
                </label>
                <select
                  id="documentType"
                  value={fileData.documentType}
                  onChange={(e) =>
                    setFileData({ ...fileData, documentType: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="id_proof">ID Proof</option>
                  <option value="income">Income Verification</option>
                  <option value="address">Address Proof</option>
                  <option value="insurance_card">Insurance Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false);
                    setFileData({ fileName: '', fileData: '', documentType: 'other' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !fileData.fileData}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Documents ({documents.length})
            </h2>
          </div>

          {documents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No documents uploaded yet</p>
              <button
                onClick={() => setShowUploadForm(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Upload your first document
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <div key={doc.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <FileText className="h-10 w-10 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {doc.fileName}
                          </h3>
                          {getStatusIcon(doc.status)}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{getDocumentTypeLabel(doc.documentType)}</span>
                          <span>•</span>
                          <span>
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>{(doc.fileSize / 1024).toFixed(2)} KB</span>
                        </div>
                        {doc.status === 'rejected' && doc.notes && (
                          <p className="mt-2 text-sm text-red-600">{doc.notes}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="ml-4 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
