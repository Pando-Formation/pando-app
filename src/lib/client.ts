import { db } from '@/lib/db'
import type { ClientInput, ClientContactInput } from '@/lib/validation/client'
import { deriveIsPublicSectorClient as deriveIsPublicSector } from '@/lib/client-shared'

export { deriveIsPublicSectorClient as deriveIsPublicSector } from '@/lib/client-shared'

function toPrismaData(input: ClientInput) {
  const isPublicSector = input.isPublicSector || deriveIsPublicSector(input.categorieJuridique)
  return {
    companyName: input.companyName,
    siret: input.siret || null,
    siren: input.siren || null,
    isPublicSector,
    categorieJuridique: input.categorieJuridique || null,
    nafRev2: input.nafRev2 || null,
    naf2025: input.naf2025 || null,
    nafSource: input.nafSource,
    address: input.address || null,
    postalCode: input.postalCode || null,
    city: input.city || null,
    region: input.region || null,
    status: input.status,
    origin: input.origin,
    assignedToId: input.assignedToId || null,
    comments: input.comments || null,
  }
}

export async function createClient(input: ClientInput) {
  return db.client.create({ data: toPrismaData(input) })
}

export async function updateClient(id: string, input: ClientInput) {
  return db.client.update({ where: { id }, data: toPrismaData(input) })
}

export async function archiveClient(id: string) {
  return db.client.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function restoreClient(id: string) {
  return db.client.update({ where: { id }, data: { deletedAt: null } })
}

export async function addClientContact(clientId: string, input: ClientContactInput) {
  return db.clientContact.create({
    data: {
      clientId,
      roles: input.roles,
      civilite: input.civilite || null,
      firstName: input.firstName,
      lastName: input.lastName,
      fonction: input.fonction || null,
      email: input.email,
      phone: input.phone || null,
    },
  })
}

export async function updateClientContact(id: string, input: ClientContactInput) {
  return db.clientContact.update({
    where: { id },
    data: {
      roles: input.roles,
      civilite: input.civilite || null,
      firstName: input.firstName,
      lastName: input.lastName,
      fonction: input.fonction || null,
      email: input.email,
      phone: input.phone || null,
    },
  })
}

export async function toggleClientContactActive(id: string, isActive: boolean) {
  return db.clientContact.update({ where: { id }, data: { isActive } })
}
