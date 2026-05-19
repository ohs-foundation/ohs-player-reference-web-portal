/**
 * Seeds HAPI FHIR with sample Practitioners, Locations, Organization, and CareTeams.
 * Run after docker compose is up: `pnpm seed` (uses FHIR_BASE_URL env, default http://localhost:8080/fhir)
 */

const FHIR_BASE = process.env.FHIR_BASE_URL ?? 'http://localhost:8080/fhir';

async function main(): Promise<void> {
  const meta = await fetch(`${FHIR_BASE}/metadata`);
  if (!meta.ok) {
    throw new Error(`FHIR metadata failed: ${meta.status} ${await meta.text()}`);
  }

  const bundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [
      {
        fullUrl: 'urn:uuid:org-1',
        resource: {
          resourceType: 'Organization',
          id: 'seed-org-1',
          active: true,
          name: 'Demo Health Organization',
          identifier: [{ system: 'urn:demo:org', value: 'seed-org-1' }],
        },
        request: { method: 'PUT', url: 'Organization/seed-org-1' },
      },
      ...Array.from({ length: 10 }, (_, i) => ({
        fullUrl: `urn:uuid:pract-${i}`,
        resource: {
          resourceType: 'Practitioner',
          id: `seed-practitioner-${i + 1}`,
          active: true,
          identifier: [{ system: 'urn:demo:staff', value: `STAFF-${i + 1}` }],
          name: [{ family: `User${i + 1}`, given: ['Seed'] }],
        },
        request: { method: 'PUT', url: `Practitioner/seed-practitioner-${i + 1}` },
      })),
      {
        fullUrl: 'urn:uuid:loc-root',
        resource: {
          resourceType: 'Location',
          id: 'seed-loc-country',
          status: 'active',
          name: 'Demo Country',
          mode: 'instance',
          physicalType: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'si', display: 'Site' }],
          },
        },
        request: { method: 'PUT', url: 'Location/seed-loc-country' },
      },
      {
        fullUrl: 'urn:uuid:loc-2',
        resource: {
          resourceType: 'Location',
          id: 'seed-loc-region',
          status: 'active',
          name: 'Demo Region',
          mode: 'instance',
          partOf: { reference: 'Location/seed-loc-country' },
        },
        request: { method: 'PUT', url: 'Location/seed-loc-region' },
      },
      {
        fullUrl: 'urn:uuid:loc-3',
        resource: {
          resourceType: 'Location',
          id: 'seed-loc-district',
          status: 'active',
          name: 'Demo District',
          mode: 'instance',
          partOf: { reference: 'Location/seed-loc-region' },
        },
        request: { method: 'PUT', url: 'Location/seed-loc-district' },
      },
      {
        fullUrl: 'urn:uuid:loc-4',
        resource: {
          resourceType: 'Location',
          id: 'seed-loc-facility',
          status: 'active',
          name: 'Demo Facility',
          mode: 'instance',
          partOf: { reference: 'Location/seed-loc-district' },
        },
        request: { method: 'PUT', url: 'Location/seed-loc-facility' },
      },
      {
        fullUrl: 'urn:uuid:loc-5',
        resource: {
          resourceType: 'Location',
          id: 'seed-loc-clinic',
          status: 'active',
          name: 'Demo Clinic',
          mode: 'instance',
          partOf: { reference: 'Location/seed-loc-facility' },
        },
        request: { method: 'PUT', url: 'Location/seed-loc-clinic' },
      },
      {
        fullUrl: 'urn:uuid:ct-1',
        resource: {
          resourceType: 'CareTeam',
          id: 'seed-careteam-1',
          status: 'active',
          name: 'Primary Care Team',
          participant: [
            {
              role: [
                {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/care-team-roles',
                      code: 'nurse',
                      display: 'Nurse',
                    },
                  ],
                },
              ],
              member: { reference: 'Practitioner/seed-practitioner-1', display: 'Seed User1' },
            },
          ],
        },
        request: { method: 'PUT', url: 'CareTeam/seed-careteam-1' },
      },
      {
        fullUrl: 'urn:uuid:ct-2',
        resource: {
          resourceType: 'CareTeam',
          id: 'seed-careteam-2',
          status: 'active',
          name: 'Secondary Care Team',
          participant: [
            {
              role: [
                {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/care-team-roles',
                      code: 'doctor',
                      display: 'Doctor',
                    },
                  ],
                },
              ],
              member: { reference: 'Practitioner/seed-practitioner-2' },
            },
          ],
        },
        request: { method: 'PUT', url: 'CareTeam/seed-careteam-2' },
      },
    ],
  };

  const res = await fetch(FHIR_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
    body: JSON.stringify(bundle),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Seed failed: ${res.status} ${body}`);
  }
  const json: unknown = await res.json();
  console.log('Seed completed:', JSON.stringify(json, null, 2));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
