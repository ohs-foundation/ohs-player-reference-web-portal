import { FhirError, isOperationOutcome } from './FhirError';

function gatewayRootFromFhirBase(fhirBaseUrl: string): string {
  return fhirBaseUrl.replace(/\/fhir\/?$/i, '').replace(/\/$/, '') || fhirBaseUrl;
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * FHIR REST client: authenticated JSON requests and optional gateway custom routes.
 * @public
 */
export class FhirClient {
  private readonly fhirBaseUrl: string;
  private readonly onError?: (error: unknown) => void;

  get baseUrl(): string {
    return this.fhirBaseUrl;
  }

  constructor(
    fhirBaseUrl: string,
    private readonly customEndpoints: Record<string, string>,
    private readonly getAccessToken: () => Promise<string | null>,
    onError?: (error: unknown) => void,
  ) {
    this.fhirBaseUrl = fhirBaseUrl.replace(/\/$/, '');
    this.onError = onError;
  }

  private async fetchWithAuth(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/fhir+json');
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/fhir+json');
    }
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const first = await fetch(url, { ...init, headers });
    if (first.status === 401) {
      await this.getAccessToken();
      const t2 = await this.getAccessToken();
      const h2 = new Headers(init.headers);
      h2.set('Accept', 'application/fhir+json');
      if (!h2.has('Content-Type') && init.body) {
        h2.set('Content-Type', 'application/fhir+json');
      }
      if (t2) h2.set('Authorization', `Bearer ${t2}`);
      return fetch(url, { ...init, headers: h2 });
    }
    return first;
  }

  private async toError(res: Response): Promise<FhirError> {
    const body = await readBody(res);
    let message = `HTTP ${res.status}`;
    if (isOperationOutcome(body)) {
      const oo = body as {
        issue?: { diagnostics?: string }[];
      };
      const d = oo.issue?.[0]?.diagnostics;
      if (d) message = d;
    }
    const err = new FhirError(message, res.status, body);
    this.onError?.(err);
    return err;
  }

  /** FHIR read interaction: `GET {base}/{resourceType}/{id}` */
  async read(resourceType: string, id: string): Promise<unknown> {
    const res = await this.fetchWithAuth(`${this.fhirBaseUrl}/${resourceType}/${id}`);
    if (!res.ok) throw await this.toError(res);
    return readBody(res);
  }

  /** FHIR search interaction: `GET {base}/{resourceType}?…` */
  async search(resourceType: string, params?: Record<string, string>): Promise<unknown> {
    const sp = params ? `?${new URLSearchParams(params).toString()}` : '';
    const res = await this.fetchWithAuth(`${this.fhirBaseUrl}/${resourceType}${sp}`);
    if (!res.ok) throw await this.toError(res);
    return readBody(res);
  }

  /** FHIR create interaction: `POST {base}/{resourceType}` — body must include `resourceType`. */
  async create(body: unknown): Promise<unknown> {
    const resourceType = (body as { resourceType?: string })?.resourceType;
    if (!resourceType) throw new Error('create() requires resourceType on body');
    const res = await this.fetchWithAuth(`${this.fhirBaseUrl}/${resourceType}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await this.toError(res);
    return readBody(res);
  }

  /** FHIR update interaction: `PUT {base}/{resourceType}/{id}` */
  async update(resourceType: string, id: string, body: unknown): Promise<unknown> {
    const res = await this.fetchWithAuth(`${this.fhirBaseUrl}/${resourceType}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await this.toError(res);
    return readBody(res);
  }

  /** FHIR delete interaction: `DELETE {base}/{resourceType}/{id}` */
  async delete(resourceType: string, id: string): Promise<unknown> {
    const res = await this.fetchWithAuth(`${this.fhirBaseUrl}/${resourceType}/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw await this.toError(res);
    if (res.status === 204) return undefined;
    return readBody(res);
  }

  /** POST a Bundle to the FHIR base URL (transaction / batch). */
  async transaction(bundle: unknown): Promise<unknown> {
    const res = await this.fetchWithAuth(`${this.fhirBaseUrl}`, {
      method: 'POST',
      body: JSON.stringify(bundle),
    });
    if (!res.ok) throw await this.toError(res);
    return readBody(res);
  }

  /** CapabilityStatement: `GET {base}/metadata` */
  async capabilities(): Promise<unknown> {
    const res = await this.fetchWithAuth(`${this.fhirBaseUrl}/metadata`, { method: 'GET' });
    if (!res.ok) throw await this.toError(res);
    return readBody(res);
  }

  /**
   * POST to a FHIR operation path (e.g. `Questionnaire/$extract`).
   * `relativePath` must not include a leading slash (it is appended to the FHIR base URL).
   */
  async postOperation(relativePath: string, body?: unknown): Promise<unknown> {
    const trimmed = relativePath.replace(/^\//, '');
    const res = await this.fetchWithAuth(`${this.fhirBaseUrl}/${trimmed}`, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw await this.toError(res);
    return readBody(res);
  }

  /**
   * GET a host-defined path relative to the gateway root (FHIR base without trailing `/fhir`).
   * Alias must exist on `customEndpoints` passed to the client.
   */
  async customGet(
    alias: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<unknown> {
    const path = this.customEndpoints[alias];
    if (!path) throw new Error(`Unknown custom endpoint alias: ${alias}`);
    const root = gatewayRootFromFhirBase(this.fhirBaseUrl);
    const filtered = params
      ? Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined) as [
            string,
            string | number | boolean,
          ][],
        )
      : {};
    const qs = Object.keys(filtered).length
      ? `?${new URLSearchParams(
          Object.fromEntries(Object.entries(filtered).map(([k, v]) => [k, String(v)])),
        )}`
      : '';
    const url = `${root}${path.startsWith('/') ? path : `/${path}`}${qs}`;
    const res = await this.fetchWithAuth(url, { method: 'GET' });
    if (!res.ok) throw await this.toError(res);
    return readBody(res);
  }

  /** POST JSON to a host-defined custom path (`customEndpoints[alias]`). Uses `application/json`. */
  async customPost(alias: string, body: unknown): Promise<unknown> {
    return this.customWrite('POST', alias, body);
  }

  /**
   * PUT JSON to a host-defined custom path (`customEndpoints[alias]`), optionally appending a path
   * segment such as a resource id (`PUT {root}{path}/{idSegment}`). Uses `application/json`.
   */
  async customPut(alias: string, body: unknown, idSegment?: string): Promise<unknown> {
    return this.customWrite('PUT', alias, body, idSegment);
  }

  private async customWrite(
    method: 'POST' | 'PUT',
    alias: string,
    body: unknown,
    idSegment?: string,
  ): Promise<unknown> {
    const path = this.customEndpoints[alias];
    if (!path) throw new Error(`Unknown custom endpoint alias: ${alias}`);
    const root = gatewayRootFromFhirBase(this.fhirBaseUrl);
    const base = `${root}${path.startsWith('/') ? path : `/${path}`}`;
    const url = idSegment ? `${base}/${encodeURIComponent(idSegment)}` : base;
    const headers = new Headers();
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');
    const token = await this.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const first = await fetch(url, { method, headers, body: JSON.stringify(body) });
    if (first.status === 401) {
      await this.getAccessToken();
      const t2 = await this.getAccessToken();
      const h2 = new Headers(headers);
      if (t2) h2.set('Authorization', `Bearer ${t2}`);
      const second = await fetch(url, { method, headers: h2, body: JSON.stringify(body) });
      if (!second.ok) throw await this.toError(second);
      return readBody(second);
    }
    if (!first.ok) throw await this.toError(first);
    return readBody(first);
  }
}
