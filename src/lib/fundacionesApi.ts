import { Fundacion, Sublink, ChangeDetected } from "@/types/fundacion";

// Usar la URL del navegador si estamos en el cliente
const API_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:3000';

export async function getFundaciones(): Promise<Fundacion[]> {
  const response = await fetch(`${API_URL}/rest/v1/fundaciones`);

  if (!response.ok) {
    throw new Error('Error al cargar fundaciones');
  }

  const data = await response.json();

  // Cargar sublinks para cada fundación
  const fundacionesWithSublinks = await Promise.all(
    data.map(async (fundacion: Fundacion) => {
      const sublinkResponse = await fetch(
        `${API_URL}/rest/v1/sublinks?fundacion_id=eq.${fundacion.id}`
      );
      const sublinks = sublinkResponse.ok ? await sublinkResponse.json() : [];
      return { ...fundacion, sublinks };
    })
  );

  return fundacionesWithSublinks;
}

export async function createFundacion(fundacion: Partial<Fundacion>): Promise<Fundacion> {
  const response = await fetch(`${API_URL}/rest/v1/fundaciones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      name: fundacion.name,
      url: fundacion.url,
      category: fundacion.category,
      status: 'pending',
      enabled: true
    }),
  });

  if (!response.ok) {
    throw new Error('Error al crear fundación');
  }

  const createdFundacion = await response.json();
  const fundacionId = Array.isArray(createdFundacion) ? createdFundacion[0].id : createdFundacion.id;

  // Crear sublinks si existen
  if (fundacion.sublinks && fundacion.sublinks.length > 0) {
    await Promise.all(
      fundacion.sublinks.map(async (sublink) => {
        if (sublink.id?.startsWith('temp-')) {
          await fetch(`${API_URL}/rest/v1/sublinks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: sublink.url,
              link_text: sublink.link_text,
              enabled: sublink.enabled ? 1 : 0,
              fundacion_id: fundacionId,
              status: 'pending'
            }),
          });
        }
      })
    );
  }

  return Array.isArray(createdFundacion) ? createdFundacion[0] : createdFundacion;
}

export async function updateFundacion(id: string, fundacion: Partial<Fundacion>): Promise<Fundacion> {
  // Extraer sublinks antes de actualizar
  const { sublinks, ...fundacionUpdates } = fundacion;

  const response = await fetch(`${API_URL}/rest/v1/fundaciones?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: fundacionUpdates.name,
      url: fundacionUpdates.url,
      category: fundacionUpdates.category,
    }),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar fundación');
  }

  // Actualizar sublinks si existen
  if (sublinks) {
    const currentSublinksResponse = await fetch(`${API_URL}/rest/v1/sublinks?fundacion_id=eq.${id}`);
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
              fundacion_id: id,
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

  return await response.json();
}

export async function deleteFundacion(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/rest/v1/fundaciones?id=eq.${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Error al eliminar fundación');
  }
}

export async function triggerMonitoring(): Promise<any> {
  const response = await fetch(`${API_URL}/api/monitor/fundaciones`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Error al iniciar monitoreo');
  }

  return await response.json();
}

export async function getChangeHistory(): Promise<ChangeDetected[]> {
  const response = await fetch(
    `${API_URL}/rest/v1/change_history?order=detected_at.desc&limit=50`
  );

  if (!response.ok) {
    throw new Error('Error al cargar historial');
  }

  return await response.json();
}

export async function markChangeAsReviewed(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/rest/v1/change_history?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reviewed: true }),
  });

  if (!response.ok) {
    throw new Error('Error al marcar como revisado');
  }
}

export async function updateSublink(id: string, enabled: boolean): Promise<void> {
  const response = await fetch(`${API_URL}/rest/v1/sublinks?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: enabled ? 'active' : 'inactive' }),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar sublink');
  }
}
