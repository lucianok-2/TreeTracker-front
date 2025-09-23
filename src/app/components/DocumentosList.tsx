'use client';

import { useState, useEffect } from 'react';
import { Predio } from '@/types/documentos';
import { supabase } from '@/lib/supabaseClient';
import DocumentoForm from './SubirDocumentoForm';

interface Documento {
  id: string;
  predio_id: string;
  tipo_documento_id: string;
  nombre_archivo: string;
  archivo_url?: string;
  tamaño_archivo?: number;
  tipo_mime?: string;
  fecha_subida: string;
  fecha_vencimiento?: string;
  notas?: string;
  estado: string;
  created_by: string;
  updated_at: string;
  tipos_documentos?: {
    id: string;
    nombre: string;
    descripcion?: string;
    obligatorio: boolean;
  };
}

interface TipoDocumento {
  id: string;
  nombre: string;
  descripcion?: string;
  obligatorio: boolean;
  activo: boolean;
}

interface DocumentosListProps {
  predio: Predio;
}

export default function DocumentosList({ predio }: DocumentosListProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Documento | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    cargarDatos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predio.id]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar tipos de documentos
      const { data: tiposData, error: tiposError } = await supabase
        .from('tipos_documentos')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (tiposError) {
        console.error('Error cargando tipos de documentos:', tiposError);
      } else {
        // Añadir la opción "Otros Documentos" al final de la lista
        const tiposConOtros = [
          ...(tiposData || []),
          {
            id: 'otros',
            nombre: 'Otros Documentos',
            descripcion: 'Documentos adicionales específicos del predio',
            obligatorio: false,
            activo: true
          }
        ];
        setTiposDocumentos(tiposConOtros);
      }

      // Cargar documentos del predio
      console.log('=== DEBUG CARGA DE DOCUMENTOS ===');
      console.log('Predio ID:', predio.id);
      console.log('Predio nombre:', predio.nombre);
      
      // Primero, verificar si hay documentos en general
      const { data: allDocs, error: allDocsError } = await supabase
        .from('documentos')
        .select('*')
        .limit(5);
      
      console.log('Documentos totales en BD (primeros 5):', allDocs?.length || 0);
      console.log('Documentos ejemplo:', allDocs);
      
      // Luego, buscar documentos específicos del predio
      const { data: documentosData, error: documentosError } = await supabase
        .from('documentos')
        .select(`
          *,
          tipos_documentos (
            id,
            nombre,
            descripcion,
            obligatorio
          )
        `)
        .eq('predio_id', predio.id)
        .eq('estado', 'activo')
        .order('fecha_subida', { ascending: false });
      
      console.log('Documentos del predio específico:', documentosData?.length || 0);

      console.log('Respuesta completa de documentos:', {
        data: documentosData,
        error: documentosError,
        count: documentosData?.length || 0
      });

      if (documentosError) {
        console.error('Error cargando documentos:', documentosError);
        setError('Error al cargar documentos: ' + documentosError.message);
      } else {
        console.log('Documentos cargados exitosamente:', documentosData?.length || 0);
        
        // Procesar documentos para mostrar "Otros" cuando no hay tipo
        const documentosProcesados = (documentosData || []).map(doc => {
          console.log('Procesando documento:', doc.nombre_archivo, 'tipo:', doc.tipo_documento_id);
          return {
            ...doc,
            tipos_documentos: doc.tipos_documentos || {
              id: 'otros',
              nombre: 'Otros Documentos',
              descripcion: 'Documento personalizado',
              obligatorio: false
            }
          };
        });
        setDocumentos(documentosProcesados);
        console.log('Documentos procesados:', documentosProcesados.length);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentoCreado = () => {
    setShowForm(false);
    cargarDatos(); // Recargar la lista
  };

  const handleEliminarDocumento = async (documentoId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('documentos')
        .delete()
        .eq('id', documentoId);

      if (error) {
        console.error('Error eliminando documento:', error);
        alert('Error al eliminar el documento');
      } else {
        cargarDatos(); // Recargar la lista
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error de conexión');
    }
  };

  const handleVistaPrevia = async (documento: Documento) => {
    setLoadingPreview(true);
    try {
      // Verificar que el bucket existe
      const verifyResponse = await fetch('/api/verify-storage', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!verifyResponse.ok) {
        throw new Error('Error verificando almacenamiento');
      }

      // Extraer el path del archivo de la URL
      const urlParts = documento.archivo_url?.split('/storage/v1/object/public/documentos/');
      const filePath = urlParts?.[1];
      
      if (!filePath) {
        throw new Error('No se pudo determinar la ruta del archivo');
      }

      // Descargar el archivo como blob
      const { data, error } = await supabase.storage
        .from('documentos')
        .download(filePath);

      if (error) {
        throw error;
      }

      if (data) {
        // Crear URL del blob para vista previa
        const url = URL.createObjectURL(data);
        setPreviewUrl(url);
        setPreviewDocument(documento);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error cargando vista previa:', error);
      alert('Error al cargar la vista previa del documento');
    } finally {
      setLoadingPreview(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Desconocido';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const getEstadoBadge = (estado: string, fechaVencimiento?: string) => {
    if (fechaVencimiento) {
      const hoy = new Date();
      const vencimiento = new Date(fechaVencimiento);
      const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 3600 * 24));

      if (diasRestantes < 0) {
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Vencido</span>;
      } else if (diasRestantes <= 30) {
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Por vencer</span>;
      }
    }
    
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Vigente</span>;
  };

  // Obtener tipos de documentos faltantes
  const tiposFaltantes = tiposDocumentos.filter(tipo => 
    tipo.obligatorio && !documentos.some(doc => doc.tipo_documento_id === tipo.id)
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">📄 Documentos de {predio.nombre}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {documentos.length} documento{documentos.length !== 1 ? 's' : ''} subido{documentos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(true)}
                className="treetracker-button px-6 py-3 rounded-lg font-medium text-white flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Subir Documento
              </button>
              <button
                onClick={cargarDatos}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 flex items-center gap-2"
                disabled={loading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Cargando...' : 'Actualizar'}
              </button>
              <button
                onClick={async () => {
                  try {
                    console.log('=== VERIFICANDO STORAGE CON AMBOS CLIENTES ===');
                    
                    // Verificar con cliente regular
                    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
                    console.log('Buckets con cliente regular:', buckets);
                    
                    if (bucketsError) {
                      console.error('Error con cliente regular:', bucketsError);
                    }
                    
                    // Verificar con API endpoint que usa admin client
                    try {
                      const response = await fetch('/api/verify-storage', {
                        method: 'GET',
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        console.log('Verificación con admin client:', data);
                        alert(`Verificación completada:\n- Cliente regular: ${buckets?.length || 0} buckets\n- Cliente admin: ${data.buckets?.length || 0} buckets`);
                      } else {
                        throw new Error('Error en API de verificación');
                      }
                    } catch (apiError) {
                      console.error('Error verificando con admin:', apiError);
                      alert(`Cliente regular: ${buckets?.length || 0} buckets\nAdmin client: Error`);
                    }
                    
                  } catch (error) {
                    console.error('Error verificando storage:', error);
                    alert('Error verificando storage');
                  }
                }}
                className="px-4 py-3 bg-purple-100 hover:bg-purple-200 rounded-lg font-medium text-purple-700 flex items-center gap-2"
              >
                🔧 Verificar Storage
              </button>
            </div>
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>Archivos hasta 10MB</p>
              {error && <p className="text-red-500">Error: {error}</p>}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Documentos Faltantes */}
      {tiposFaltantes.length > 0 && (
        <div className="p-6 bg-yellow-50 border-b border-yellow-200">
          <h3 className="text-lg font-medium text-yellow-800 mb-3">⚠️ Documentos Obligatorios Faltantes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {tiposFaltantes.map(tipo => (
              <div key={tipo.id} className="text-sm text-yellow-700">
                • {tipo.nombre}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Documentos */}
      <div className="p-6">
        {documentos.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos subidos</h3>
            <p className="text-gray-500 mb-4">Comienza subiendo el primer documento para este predio: <strong>{predio.nombre}</strong></p>
            <div className="text-xs text-gray-400 mb-4">
              <p>Debug: Predio ID: {predio.id}</p>
              <p>Total documentos encontrados: {documentos.length}</p>
              <button
                onClick={() => {
                  console.log('Estado actual:');
                  console.log('- Predio:', predio);
                  console.log('- Documentos:', documentos);
                  console.log('- Loading:', loading);
                  console.log('- Error:', error);
                }}
                className="text-blue-500 hover:text-blue-700 underline"
              >
                Ver info de debug en consola
              </button>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="treetracker-button px-8 py-4 rounded-lg font-medium text-white text-lg flex items-center gap-3 mx-auto"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Subir Primer Documento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Subida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documentos.map((documento) => (
                  <tr key={documento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{documento.nombre_archivo}</div>
                        <div className="text-sm text-gray-500">
                          {formatFileSize(documento.tamaño_archivo)} • {documento.tipo_mime}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{documento.tipos_documentos?.nombre}</div>
                      {documento.tipos_documentos?.obligatorio && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                          Obligatorio
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(documento.fecha_subida)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {documento.fecha_vencimiento ? formatDate(documento.fecha_vencimiento) : 'Sin vencimiento'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getEstadoBadge(documento.estado, documento.fecha_vencimiento)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {documento.archivo_url && (
                          <>
                            <button
                              onClick={() => handleVistaPrevia(documento)}
                              disabled={loadingPreview}
                              className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                            >
                              {loadingPreview ? 'Cargando...' : 'Vista Previa'}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  console.log('Intentando descarga directa para:', documento.nombre_archivo);
                                  
                                  // Extraer el path del archivo de la URL
                                  const urlParts = documento.archivo_url?.split('/storage/v1/object/public/documentos/');
                                  const filePath = urlParts?.[1];
                                  
                                  if (filePath) {
                                    // Crear nueva URL de descarga
                                    const { data } = await supabase.storage
                                      .from('documentos')
                                      .download(filePath);
                                    
                                    if (data) {
                                      // Crear blob y descargar
                                      const url = URL.createObjectURL(data);
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = documento.nombre_archivo;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      URL.revokeObjectURL(url);
                                    } else {
                                      alert('Error al descargar el archivo');
                                    }
                                  } else {
                                    alert('No se pudo determinar la ruta del archivo');
                                  }
                                } catch (error) {
                                  console.error('Error en descarga:', error);
                                  alert('Error al descargar el archivo');
                                }
                              }}
                              className="text-green-600 hover:text-green-900"
                            >
                              Descargar
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEliminarDocumento(documento.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para subir documento */}
      {showForm && (
        <DocumentoForm
          predio={predio}
          tiposDocumentos={tiposDocumentos.map(t => ({
            id: t.id,
            nombre: t.nombre,
            descripcion: t.descripcion || '',
            obligatorio: t.obligatorio
          }))}
          onClose={() => setShowForm(false)}
          onDocumentoCreado={handleDocumentoCreado}
        />
      )}

      {/* Modal de Vista Previa */}
      {showPreview && previewDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg w-11/12 h-5/6 max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{previewDocument.nombre_archivo}</h3>
              <button
                onClick={() => {
                  // Limpiar URL del blob para liberar memoria
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                  }
                  setShowPreview(false);
                  setPreviewDocument(null);
                  setPreviewUrl(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 p-4">
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title={`Vista previa de ${previewDocument?.nombre_archivo}`}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
