import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface FileUploadProps {
  courseId?: number;
  onUploadSuccess?: (file: any) => void;
  acceptedTypes?: string[];
  maxSizeMB?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
  courseId,
  onUploadSuccess,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.mp4', '.avi', '.mov', '.jpg', '.jpeg', '.png'],
  maxSizeMB = 50
}) => {
  const { usuario } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Validar tamaño
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `El archivo es muy grande. Máximo ${maxSizeMB}MB permitidos.`;
    }

    // Validar tipo
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `Tipo de archivo no permitido. Tipos aceptados: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'mp4':
      case 'avi':
      case 'mov': return '🎥';
      case 'jpg':
      case 'jpeg':
      case 'png': return '🖼️';
      case 'zip':
      case 'rar': return '📦';
      default: return '📁';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (courseId) {
        formData.append('courseId', courseId.toString());
      }

      const response = await api.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      const uploadedFile = {
        id: Date.now(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: response.data.url,
        uploadedAt: new Date().toISOString(),
      };

      setUploadedFiles(prev => [...prev, uploadedFile]);
      
      if (onUploadSuccess) {
        onUploadSuccess(uploadedFile);
      }

    } catch (error: any) {
      console.error('Error subiendo archivo:', error);
      setError(error.response?.data?.message || 'Error al subir el archivo');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFile(files[0]); // Por ahora solo uno a la vez
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (fileId: number) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Área de drag & drop */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept={acceptedTypes.join(',')}
          className="hidden"
        />

        {!isUploading ? (
          <div>
            <div className="mb-4">
              <span className="text-6xl">📤</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Arrastra y suelta tu archivo aquí
            </h3>
            <p className="text-gray-600 mb-4">
              o haz clic para seleccionar un archivo
            </p>
            <button
              onClick={openFileDialog}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-200"
            >
              Seleccionar Archivo
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Tipos permitidos: {acceptedTypes.join(', ')} | Máximo: {maxSizeMB}MB
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <span className="text-6xl">⏳</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Subiendo archivo...
            </h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{uploadProgress}% completado</p>
          </div>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-3">⚠️</span>
            <div>
              <h4 className="text-red-800 font-medium">Error</h4>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de archivos subidos */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            📁 Archivos Subidos ({uploadedFiles.length})
          </h3>
          
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center flex-1">
                  <span className="text-2xl mr-3">{getFileIcon(file.name)}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)} • Subido el{' '}
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-md text-sm transition duration-200"
                  >
                    📥 Descargar
                  </a>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md text-sm transition duration-200"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información del usuario */}
      {usuario && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-blue-500 mr-2">👤</span>
            <span className="text-sm text-blue-700">
              Subiendo como: <strong>{usuario.nombre}</strong> ({usuario.tipo})
              {courseId && (
                <span> • Curso ID: {courseId}</span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;