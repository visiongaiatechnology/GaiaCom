// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.identity

internal class DefaultLocalIdentityService(
    private val binding: NativeIdentityBinding,
) : LocalIdentityService {
    override fun validateMnemonic(mnemonicUtf8: ByteArray): Boolean {
        if (mnemonicUtf8.size !in 1..MAX_MNEMONIC_BYTES) return false
        val localMnemonic = mnemonicUtf8.copyOf()
        return try {
            binding.validateMnemonic(localMnemonic)
        } catch (exception: Exception) {
            throw LocalIdentityException(LocalIdentityFailure.VALIDATION_UNAVAILABLE, exception)
        } finally {
            localMnemonic.fill(0)
        }
    }

    override fun deriveIdentity(mnemonicUtf8: ByteArray): LocalIdentityKeyMaterial {
        if (mnemonicUtf8.size !in 1..MAX_MNEMONIC_BYTES) {
            throw LocalIdentityException(LocalIdentityFailure.INVALID_MNEMONIC)
        }
        val localMnemonic = mnemonicUtf8.copyOf()
        return try {
            LocalIdentityKeyMaterial.capture(binding.deriveIdentity(localMnemonic))
        } catch (exception: LocalIdentityException) {
            throw exception
        } catch (exception: Exception) {
            throw LocalIdentityException(LocalIdentityFailure.DERIVATION_FAILED, exception)
        } finally {
            localMnemonic.fill(0)
        }
    }

    override fun importIdentity(
        ed25519PrivateSeed: ByteArray,
        x25519Private: ByteArray,
        mlKem1024Private: ByteArray,
        mlDsa87Private: ByteArray,
    ): LocalIdentityKeyMaterial {
        val source = arrayOf(ed25519PrivateSeed, x25519Private, mlKem1024Private, mlDsa87Private)
        if (!hasValidImportLengths(source)) {
            throw LocalIdentityException(LocalIdentityFailure.NATIVE_KEY_MATERIAL_INVALID)
        }
        val local = source.map(ByteArray::copyOf)
        return try {
            LocalIdentityKeyMaterial.capture(
                binding.importIdentity(local[0], local[1], local[2], local[3]),
            )
        } catch (exception: LocalIdentityException) {
            throw exception
        } catch (exception: Exception) {
            throw LocalIdentityException(LocalIdentityFailure.IMPORT_FAILED, exception)
        } finally {
            local.forEach { material -> material.fill(0) }
        }
    }

    private fun hasValidImportLengths(source: Array<ByteArray>): Boolean =
        source[0].size == ED25519_PRIVATE_BYTES &&
            source[1].size == X25519_PRIVATE_BYTES &&
            source[2].size == ML_KEM_1024_PRIVATE_BYTES &&
            source[3].size == ML_DSA_87_PRIVATE_BYTES

    private companion object {
        const val MAX_MNEMONIC_BYTES = 256
        const val ED25519_PRIVATE_BYTES = 32
        const val X25519_PRIVATE_BYTES = 32
        const val ML_KEM_1024_PRIVATE_BYTES = 3_168
        const val ML_DSA_87_PRIVATE_BYTES = 4_896
    }
}
