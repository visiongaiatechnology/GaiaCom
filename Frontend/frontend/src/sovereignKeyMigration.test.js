// STATUS: PLATIN
import { describe, expect, it, vi } from 'vitest';
import { reconcileSovereignKeyset } from './sovereignKeyMigration.js';

const derivedKeys = {
  sign: { public: '11', private: '12' },
  box: { public: '22' },
  pke: { public: '33' },
  mldsa87: { public: '44' }
};

function identity(id, hqc256 = '') {
  return {
    ID: id,
    PublicRecord: {
      public_keys: { identity: '11', box: '22', pke: '33', mldsa87: '44', hqc256 },
      keyset_proof: hqc256 ? { version: 'v1', ed25519: 'proof' } : undefined
    }
  };
}

const createProof = publicKeys => ({ version: 'v1', ed25519: `proof:${publicKeys.hqc256}` });

describe('sovereign keyset migration', () => {
  it('upgrades a legacy identity without a cryptographic downgrade', async () => {
    const migrateIdentity = vi.fn().mockResolvedValue({ status: 'ok' });
    const result = await reconcileSovereignKeyset({
      identities: [identity('legacy')],
      derivedKeys,
      localHqc: null,
      generatePendingHqc: vi.fn().mockResolvedValue({ public: '55', private: '56' }),
      migrateIdentity,
      createProof,
      verifyProof: vi.fn()
    });

    expect(result).toEqual({ hqc: { public: '55', private: '56' }, generated: true, migrated: 1 });
    expect(migrateIdentity).toHaveBeenCalledWith('legacy', {
      publicKeys: { identity: '11', box: '22', pke: '33', mldsa87: '44', hqc256: '55' },
      keysetProof: { version: 'v1', ed25519: 'proof:55' }
    });
  });

  it('accepts an existing matching sovereign keyset idempotently', async () => {
    const migrateIdentity = vi.fn();
    const result = await reconcileSovereignKeyset({
      identities: [identity('current', 'AABB')],
      derivedKeys,
      localHqc: { public: 'aabb', private: 'ccdd' },
      generatePendingHqc: vi.fn(),
      migrateIdentity,
      createProof,
      verifyProof: vi.fn().mockReturnValue(true)
    });

    expect(result.migrated).toBe(0);
    expect(result.generated).toBe(false);
    expect(migrateIdentity).not.toHaveBeenCalled();
  });

  it('blocks recovery-less access when the server already has HQC-256', async () => {
    await expect(reconcileSovereignKeyset({
      identities: [identity('current', 'aabb')],
      derivedKeys,
      localHqc: null,
      generatePendingHqc: vi.fn(),
      migrateIdentity: vi.fn(),
      createProof,
      verifyProof: vi.fn()
    })).rejects.toThrow('Gerätekopplung');
  });

  it('blocks a mismatching local HQC-256 key instead of rotating it', async () => {
    await expect(reconcileSovereignKeyset({
      identities: [identity('current', 'aabb')],
      derivedKeys,
      localHqc: { public: 'ffff', private: 'eeee' },
      generatePendingHqc: vi.fn(),
      migrateIdentity: vi.fn(),
      createProof,
      verifyProof: vi.fn().mockReturnValue(true)
    })).rejects.toThrow('stille Schlüsselrotation');
  });

  it('repairs a matching HQC-256 record with a missing proof', async () => {
    const migrateIdentity = vi.fn().mockResolvedValue({ status: 'ok' });
    const result = await reconcileSovereignKeyset({
      identities: [identity('repair', 'aabb')],
      derivedKeys,
      localHqc: { public: 'aabb', private: 'ccdd' },
      generatePendingHqc: vi.fn(),
      migrateIdentity,
      createProof,
      verifyProof: vi.fn().mockReturnValue(false)
    });

    expect(result.migrated).toBe(1);
    expect(migrateIdentity).toHaveBeenCalledOnce();
  });
});
