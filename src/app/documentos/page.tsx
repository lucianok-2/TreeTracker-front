'use client';

import { useState, useEffect } from 'react';
import { Predio } from '@/types/documentos';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/app/components/Navbar';
import SubirDocumentoForm from '@/app/components/SubirDocumentoForm';

export default function DocumentosPage() {
  const [predios, setPredios] = useState<Predio[]>([]);
  const [prediosFiltrados, setPrediosFiltrados] = useState<Predio[]>([]);
  const [predioSeleccionado, setPredioSeleccionado] = useState<Predio | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [tiposDocumentos, setTiposDocumentos] = useState<{
    id: string;
    nombre: string;
    descripcion?: string;
    obligatorio: boolean;
  }[]>([]);

  useEffect(() => {
    cargarPredios();
  }, []);

  useEffect(() => {
    // Filtrar predios basado en la búsqueda
    if (!busqueda.trim()) {
      setPrediosFiltrados(predios);
    } else {
      const filtrados = predios.filter(predio =>
        predio.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        predio.propietario.toLowerCase().includes(busqueda.toLowerCase()) ||
        predio.ubicacion.toLowerCase().includes(busqueda.toLowerCase())
      );
      setPrediosFiltrados(filtrados);
    }
  }, [busqueda, predios]);

  const cargarPredios = async () => {
    try {
      setLoading(true);
      
      // Cargar predios
      const { data: prediosData, error: prediosError } = await supabase
        .from('predios')
        .select('*')
        .order('nombre');

      if (prediosError) {
        setError('Error al cargar predios');
        console.error('Error:', prediosError);
      } else {
        setPredios(prediosData || []);
        setPrediosFiltrados(prediosData || []);
      }

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
            obligatorio: false
          }
        ];
        setTiposDocumentos(tiposConOtros);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const CertificacionBadge = ({ tipo }: { tipo: 'fsc' | 'pefc' }) => {
    const config = {
      fsc: { label: 'FSC', color: 'bg-green-100 text-green-800' },
      pefc: { label: 'PEFC', color: 'bg-blue-100 text-blue-800' }
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config[tipo].color}`}>
        {config[tipo].label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--light-green)' }}>
        <Navbar />
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando predios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--light-green)' }}>
      <Navbar />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📄 Gestión de Documentos</h1>
          <p className="text-gray-600 mt-2">Selecciona un predio para gestionar sus documentos</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Predios */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🏞️ Seleccionar Predio</h2>
              
              {/* Buscador */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre, propietario o ubicación..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                {busqueda && (
                  <p className="text-sm text-gray-500 mt-1">
                    {prediosFiltrados.length} resultado{prediosFiltrados.length !== 1 ? 's' : ''} encontrado{prediosFiltrados.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              
              {prediosFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🏞️</div>
                  {busqueda ? (
                    <>
                      <p className="text-gray-500 mb-4">No se encontraron predios que coincidan con &ldquo;{busqueda}&rdquo;</p>
                      <button
                        onClick={() => setBusqueda('')}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Limpiar búsqueda
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 mb-4">No hay predios registrados</p>
                      <a
                        href="/predios/nuevo"
                        className="treetracker-button px-4 py-2 rounded-lg font-medium text-white inline-block"
                      >
                        Crear Primer Predio
                      </a>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {prediosFiltrados.map((predio) => (
                    <div
                      key={predio.id}
                      onClick={() => setPredioSeleccionado(predio)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        predioSeleccionado?.id === predio.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{predio.nombre}</h3>
                        {predioSeleccionado?.id === predio.id && (
                          <div className="text-blue-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{predio.propietario}</p>
                      <p className="text-sm text-gray-500 mb-3">{predio.superficie_hectareas} hectáreas</p>
                      
                      <div className="flex space-x-2">
                        {predio.certificacion_fsc && <CertificacionBadge tipo="fsc" />}
                        {predio.certificacion_pefc && <CertificacionBadge tipo="pefc" />}
                        {!predio.certificacion_fsc && !predio.certificacion_pefc && (
                          <span className="text-gray-400 text-xs">Sin certificaciones</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel de Documentos */}
          <div className="lg:col-span-2">
            {predioSeleccionado ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">📄 Documentos de {predioSeleccionado.nombre}</h2>
                    <p className="text-sm text-gray-600 mt-1">Gestiona los documentos de este predio</p>
                  </div>
                  <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                    onClick={() => setShowForm(true)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Subir Documento
                  </button>
                </div>
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay documentos subidos
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Comienza subiendo el primer documento para este predio
                  </p>
                  <button 
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-medium text-lg"
                    onClick={() => setShowForm(true)}
                  >
                    📁 Subir Primer Documento
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Selecciona un predio
                  </h3>
                  <p className="text-gray-500">
                    Escoge un predio de la lista para ver y gestionar sus documentos
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para subir documento */}
      {showForm && predioSeleccionado && (
        <SubirDocumentoForm
          predio={predioSeleccionado}
          tiposDocumentos={tiposDocumentos}
          onClose={() => setShowForm(false)}
          onDocumentoCreado={() => {
            setShowForm(false);
            // Aquí podrías recargar los documentos si tuvieras una lista
            alert('Documento subido exitosamente!');
          }}
        />
      )}
    </div>
  );
}
