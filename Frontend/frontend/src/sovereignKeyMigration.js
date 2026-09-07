// STATUS: PLATIN

function parsePublicRecord(identity) {
  const value = identity?.PublicRecord ?? identity?.publicRecord;
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || value.trim() === '') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function identityId(identity) {
  const value = identity?.ID ?? identity?.id;
  return typeof value === 'string' ? value : '';
}

function sameHex(left, right) {
  return typeof left === 'string'
    && typeof right === 'string'
    && left.toLowerCase() === right.toLowerCase();
}

export async function reconcileSovereignKeyset({
  identities,
  derivedKeys,
  localHqc,
  generatePendingHqc,
  migrateIdentity,
  createProof,
  verifyProof
}) {
  const ownedIdentities = Array.isArray(identities)
    ? identities.filter(identity => identityId(identity))
    : [];
  const records = ownedIdentities.map(identity => ({
    id: identityId(identity),
    record: parsePublicRecord(identity)
  }));
  const sovereignRecords = records.filter(({ record }) => Boolean(record?.public_keys?.hqc256));

  let hqc = localHqc;
  if (sovereignRecords.length > 0) {
    if (!hqc?.public || !hqc?.private) {
      throw new Error('Diese Identität besitzt bereits HQC-256. Der lokale private Schlüssel muss über die Gerätekopplung wiederhergestellt werden.');
    }
    for (const { record } of sovereignRecords) {
      if (!sameHex(record.public_keys.hqc256, hqc.public)) {
        throw new Error('Server-Keyset und lokaler HQC-256 Schlüssel stimmen nicht überein. Eine stille Schlüsselrotation wurde blockiert.');
      }
    }
  }

  let generated = false;
  if (!hqc?.public || !hqc?.private) {
    hqc = await generatePendingHqc();
    generated = true;
  }

  const publicKeys = {
    identity: derivedKeys?.sign?.public || '',
    box: derivedKeys?.box?.public || '',
    pke: derivedKeys?.pke?.public || '',
    mldsa87: derivedKeys?.mldsa87?.public || '',
    hqc256: hqc.public
  };
  const keysetProof = createProof(publicKeys, derivedKeys?.sign?.private || '');

  let migrated = 0;
  for (const { id, record } of records) {
    if (record?.public_keys?.hqc256 && verifyProof(record)) continue;
    await migrateIdentity(id, { publicKeys, keysetProof });
    migrated += 1;
  }

  return { hqc, generated, migrated };
}
