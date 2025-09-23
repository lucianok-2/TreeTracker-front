'use client';

import { useState } from 'react';
import { Predio } from '@/types/documentos';
import { useAuth } from '@/contexts/AuthContext';
import Modal from './Modal';

interface TipoDocumento {
  id: string;
  nombre: string;
  descripcion?: string;
  obligatorio: boolean;
}

interface DocumentoFormProps {
  predio: Predio;
  tiposDocumentos: TipoDocumento[];
  onClose: () => void;
  onDocumentoCreado: () => void;
}

export default function SubirDocumentoForm({ 
  predio, 
  tiposDocumentos, 
  onClose, 
  onDocumentoCreado 
}: DocumentoFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    tipo_documento_id: '',
    nombre_personalizado: '',
    fecha_vencimiento: '',
    notas: ''
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño del archivo (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo no puede ser mayor a 10MB');
        return;
      }
      setArchivo(file);
      setError('');
    }
  };

  const tipoSeleccionado = tiposDocumentos.find(t => t.id === formData.tipo_documento_id);
  const esOtroTipo = tipoSeleccionado?.nombre === 'Otros Documentos' || formData.tipo_documento_id === 'otros';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Debes estar autenticado');
      return;
    }

    if (!formData.tipo_documento_id) {
      setError('Debes seleccionar un tipo de documento');
      return;
    }

    if (esOtroTipo && !formData.nombre_personalizado.trim()) {
      setError('Debes especificar el nombre del documento');
      return;
    }

    if (!archivo) {
      setError('Debes seleccionar un archivo');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Crear FormData para enviar al endpoint
      const uploadFormData = new FormData();
      uploadFormData.append('archivo', archivo);
      uploadFormData.append('predio_id', predio.id);
      uploadFormData.append('tipo_documento_id', formData.tipo_documento_id);
      uploadFormData.append('user_id', user.id);
      
      if (formData.nombre_personalizado.trim()) {
        uploadFormData.append('nombre_personalizado', formData.nombre_personalizado.trim());
      }
      
      if (formData.fecha_vencimiento) {
        uploadFormData.append('fecha_vencimiento', formData.fecha_vencimiento);
      }
      
      if (formData.notas) {
        uploadFormData.append('notas', formData.notas);
      }

      // Enviar al endpoint API
      const response = await fetch('/api/upload-documento', {
        method: 'POST',
        body: uploadFormData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error subiendo documento');
      }

      console.log('Documento subido exitosamente:', result);

      // Éxito
      onDocumentoCreado();
      
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="📁 Subir Documento">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Información del Predio */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-900">Predio Seleccionado</h3>
          <p className="text-sm text-blue-700 mt-1">{predio.nombre} - {predio.propietario}</p>
        </div>

        {/* Tipo de Documento */}
        <div>
          <label htmlFor="tipo_documento_id" className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Documento *
          </label>
          <select
            id="tipo_documento_id"
            name="tipo_documento_id"
            value={formData.tipo_documento_id}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Selecciona un tipo de documento</option>
            {tiposDocumentos.map(tipo => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre} {tipo.obligatorio && '(Obligatorio)'}
              </option>
            ))}
          </select>
          {tipoSeleccionado?.descripcion && (
            <p className="text-sm text-gray-600 mt-1">{tipoSeleccionado.descripcion}</p>
          )}
        </div>

        {/* Nombre Personalizado para "Otros" */}
        {esOtroTipo && (
          <div>
            <label htmlFor="nombre_personalizado" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Documento *
            </label>
            <input
              type="text"
              id="nombre_personalizado"
              name="nombre_personalizado"
              value={formData.nombre_personalizado}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Certificado de Calidad, Informe Técnico..."
              required={esOtroTipo}
            />
            <p className="text-sm text-gray-500 mt-1">
              Especifica qué tipo de documento estás subiendo
            </p>
          </div>
        )}

        {/* Selección de Archivo */}
        <div>
          <label htmlFor="archivo" className="block text-sm font-medium text-gray-700 mb-2">
            Archivo *
          </label>
          <input
            type="file"
            id="archivo"
            onChange={handleArchivoChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Formatos aceptados: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF (máximo 10MB)
          </p>
          {archivo && (
            <div className="mt-2 p-2 bg-gray-50 rounded border">
              <p className="text-sm text-gray-700">
                <strong>Archivo seleccionado:</strong> {archivo.name}
              </p>
              <p className="text-sm text-gray-500">
                Tamaño: {(archivo.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>

        {/* Fecha de Vencimiento */}
        <div>
          <label htmlFor="fecha_vencimiento" className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Vencimiento (Opcional)
          </label>
          <input
            type="date"
            id="fecha_vencimiento"
            name="fecha_vencimiento"
            value={formData.fecha_vencimiento}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Si el documento tiene fecha de vencimiento, se generarán alertas automáticas
          </p>
        </div>

        {/* Notas */}
        <div>
          <label htmlFor="notas" className="block text-sm font-medium text-gray-700 mb-2">
            Notas (Opcional)
          </label>
          <textarea
            id="notas"
            name="notas"
            value={formData.notas}
            onChange={handleChange}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="Información adicional sobre el documento..."
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="treetracker-button px-6 py-2 rounded-lg font-medium text-white disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Subiendo...' : 'Subir Documento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}