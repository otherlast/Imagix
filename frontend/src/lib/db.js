import { set, get, del } from 'idb-keyval';

// Guardar la lista de imágenes/proyectos en IndexedDB sin límite de 5MB
export async function saveProjectLocal(imagesArray, placements) {
  try {
    const payload = {
      images: imagesArray, // Guarda los Blobs/Files directamente
      placements: placements,
      updatedAt: new Date().toISOString()
    };
    await set('imagix_current_project', payload);
    console.log('Proyecto guardado en IndexedDB localmente');
    return true;
  } catch (error) {
    console.error('Error guardando en IndexedDB:', error);
    return false;
  }
}

// Cargar el proyecto guardado al abrir la app
export async function loadProjectLocal() {
  try {
    const data = await get('imagix_current_project');
    return data || null;
  } catch (error) {
    console.error('Error cargando de IndexedDB:', error);
    return null;
  }
}

// Borrar el proyecto local
export async function clearProjectLocal() {
  try {
    await del('imagix_current_project');
  } catch (error) {
    console.error('Error limpiando IndexedDB:', error);
  }
}