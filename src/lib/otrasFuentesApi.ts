import { OtraFuente } from "@/types/fundacion";

const API_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:3000';

export async function getOtrasFuentes(): Promise<OtraFuente[]> {
  const response = await fetch(`${API_URL}/rest/v1/otras_fuentes`);

  if (!response.ok) {
    throw new Error('Error al cargar otras fuentes');
  }

  const data = await response.json();

  // Cargar sublinks para cada fuente
  const fuentesWithSublinks = await Promise.all(
    data.map(async (fuente: OtraFuente) => {
      const sublinkResponse = await fetch(
        `${API_URL}/rest/v1/sublinks?otra_fuente_id=eq.${fuente.id}`
      );
      const sublinks = sublinkResponse.ok ? await sublinkResponse.json() : [];
      return { ...fuente, sublinks };
    })
  );

  return fuentesWithSublinks;
}

export async function createOtraFuente(fuente: Partial<OtraFuente>): Promise<OtraFuente> {
  const response = await fetch(`${API_URL}/rest/v1/otras_fuentes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      name: fuente.name,
      url: fuente.url,
      category: fuente.category,
      type: fuente.type,
      enabled: true,
      status: 'pending'
    }),
  });

  if (!response.ok) {
    throw new Error('Error al crear fuente');
  }

  const createdFuente = await response.json();
  const fuenteId = Array.isArray(createdFuente) ? createdFuente[0].id : createdFuente.id;

  // Crear sublinks si existen
  if (fuente.sublinks && fuente.sublinks.length > 0) {
    await Promise.all(
      fuente.sublinks.map(async (sublink) => {
        if (sublink.id?.startsWith('temp-')) {
          await fetch(`${API_URL}/rest/v1/sublinks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: sublink.url,
              link_text: sublink.link_text,
              enabled: sublink.enabled ? 1 : 0,
              otra_fuente_id: fuenteId,
              status: 'pending'
            }),
          });
        }
      })
    );
  }

  return Array.isArray(createdFuente) ? createdFuente[0] : createdFuente;
}

export async function updateOtraFuente(id: string, updates: Partial<OtraFuente>): Promise<void> {
  // Extraer sublinks antes de actualizar
  const { sublinks, ...fuenteUpdates } = updates;

  const response = await fetch(`${API_URL}/rest/v1/otras_fuentes?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fuenteUpdates),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar fuente');
  }

  // Actualizar sublinks si existen
  if (sublinks) {
    const currentSublinksResponse = await fetch(`${API_URL}/rest/v1/sublinks?otra_fuente_id=eq.${id}`);
    const currentSublinks = currentSublinksResponse.ok ? await currentSublinksResponse.json() : [];

    const newSublinkIds = sublinks.map(s => s.id);
    const toDelete = currentSublinks.filter((s: any) => !newSublinkIds.includes(s.id));
    await Promise.all(
      toDelete.map((s: any) =>
        fetch(`${API_URL}/rest/v1/sublinks?id=eq.${s.id}`, { method: 'DELETE' })
      )
    );

    await Promise.all(
      sublinks.map(async (sublink) => {
        if (sublink.id?.startsWith('temp-')) {
          await fetch(`${API_URL}/rest/v1/sublinks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: sublink.url,
              link_text: sublink.link_text,
              enabled: sublink.enabled ? 1 : 0,
              otra_fuente_id: id,
              status: 'pending'
            }),
          });
        } else {
          await fetch(`${API_URL}/rest/v1/sublinks?id=eq.${sublink.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: sublink.url,
              link_text: sublink.link_text,
              enabled: sublink.enabled ? 1 : 0,
            }),
          });
        }
      })
    );
  }
}

export async function deleteOtraFuente(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/rest/v1/otras_fuentes?id=eq.${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Error al eliminar fuente');
  }
}
