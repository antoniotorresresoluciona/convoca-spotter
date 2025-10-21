import { EntePublico } from "@/types/fundacion";

const API_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:3000';

export async function getEntesPublicos(): Promise<EntePublico[]> {
  const response = await fetch(`${API_URL}/rest/v1/entes_publicos`);

  if (!response.ok) {
    throw new Error('Error al cargar entes públicos');
  }

  const data = await response.json();

  // Cargar sublinks para cada ente
  const entesWithSublinks = await Promise.all(
    data.map(async (ente: EntePublico) => {
      const sublinkResponse = await fetch(
        `${API_URL}/rest/v1/sublinks?ente_publico_id=eq.${ente.id}`
      );
      const sublinks = sublinkResponse.ok ? await sublinkResponse.json() : [];
      return { ...ente, sublinks };
    })
  );

  return entesWithSublinks;
}

export async function createEntePublico(ente: Partial<EntePublico>): Promise<EntePublico> {
  const response = await fetch(`${API_URL}/rest/v1/entes_publicos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      name: ente.name,
      url: ente.url,
      category: ente.category,
      entity: ente.entity,
      enabled: true,
      status: 'pending'
    }),
  });

  if (!response.ok) {
    throw new Error('Error al crear ente público');
  }

  const createdEnte = await response.json();
  const enteId = Array.isArray(createdEnte) ? createdEnte[0].id : createdEnte.id;

  // Crear sublinks si existen
  if (ente.sublinks && ente.sublinks.length > 0) {
    await Promise.all(
      ente.sublinks.map(async (sublink) => {
        // Solo crear sublinks nuevos (los que tienen id temporal)
        if (sublink.id?.startsWith('temp-')) {
          await fetch(`${API_URL}/rest/v1/sublinks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: sublink.url,
              link_text: sublink.link_text,
              enabled: sublink.enabled ? 1 : 0,
              ente_publico_id: enteId,
              status: 'pending'
            }),
          });
        }
      })
    );
  }

  return Array.isArray(createdEnte) ? createdEnte[0] : createdEnte;
}

export async function updateEntePublico(id: string, updates: Partial<EntePublico>): Promise<void> {
  // Extraer sublinks antes de actualizar
  const { sublinks, ...enteUpdates } = updates;

  const response = await fetch(`${API_URL}/rest/v1/entes_publicos?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(enteUpdates),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar ente público');
  }

  // Actualizar sublinks si existen
  if (sublinks) {
    // Obtener sublinks actuales
    const currentSublinksResponse = await fetch(`${API_URL}/rest/v1/sublinks?ente_publico_id=eq.${id}`);
    const currentSublinks = currentSublinksResponse.ok ? await currentSublinksResponse.json() : [];

    // Eliminar sublinks que ya no están en la lista
    const newSublinkIds = sublinks.map(s => s.id);
    const toDelete = currentSublinks.filter((s: any) => !newSublinkIds.includes(s.id));
    await Promise.all(
      toDelete.map((s: any) =>
        fetch(`${API_URL}/rest/v1/sublinks?id=eq.${s.id}`, { method: 'DELETE' })
      )
    );

    // Crear o actualizar sublinks
    await Promise.all(
      sublinks.map(async (sublink) => {
        if (sublink.id?.startsWith('temp-')) {
          // Crear nuevo sublink
          await fetch(`${API_URL}/rest/v1/sublinks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: sublink.url,
              link_text: sublink.link_text,
              enabled: sublink.enabled ? 1 : 0,
              ente_publico_id: id,
              status: 'pending'
            }),
          });
        } else {
          // Actualizar sublink existente
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

export async function deleteEntePublico(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/rest/v1/entes_publicos?id=eq.${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Error al eliminar ente público');
  }
}
