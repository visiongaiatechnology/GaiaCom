// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.identity

import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

class LocalIdentityKeyMaterial private constructor(
    private val native: NativeIdentityKeyBundle,
    private val ed25519Public: ByteArray,
    private val ed25519PrivateSeed: ByteArray,
    private val x25519Public: ByteArray,
    private val x25519Private: ByteArray,
    private val mlKem1024Public: ByteArray,
    private val mlKem1024Private: ByteArray,
    private val mlDsa87Public: ByteArray,
    private val mlDsa87Private: ByteArray,
) : AutoCloseable {
    private val lifecycle = ReentrantReadWriteLock()
    private var closed = false

    fun ed25519PublicCopy(): ByteArray = defensiveCopy(ed25519Public)

    fun ed25519PrivateSeedCopy(): ByteArray = defensiveCopy(ed25519PrivateSeed)

    fun x25519PublicCopy(): ByteArray = defensiveCopy(x25519Public)

    fun x25519PrivateCopy(): ByteArray = defensiveCopy(x25519Private)

    fun mlKem1024PublicCopy(): ByteArray = defensiveCopy(mlKem1024Public)

    fun mlKem1024PrivateCopy(): ByteArray = defensiveCopy(mlKem1024Private)

    fun mlDsa87PublicCopy(): ByteArray = defensiveCopy(mlDsa87Public)

    fun mlDsa87PrivateCopy(): ByteArray = defensiveCopy(mlDsa87Private)

    override fun close() {
        var releaseFailure: Throwable? = null
        lifecycle.write {
            if (closed) return
            closed = true
            ownedArrays().forEach { material -> material.fill(0) }
            try {
                native.close()
            } catch (failure: Throwable) {
                releaseFailure = failure
            }
        }
        releaseFailure?.let { failure ->
            if (failure is Exception) {
                throw LocalIdentityException(LocalIdentityFailure.NATIVE_RELEASE_FAILED, failure)
            }
            throw failure
        }
    }

    private fun defensiveCopy(source: ByteArray): ByteArray = lifecycle.read {
        if (closed) throw LocalIdentityException(LocalIdentityFailure.MATERIAL_CLOSED)
        source.copyOf()
    }

    private fun ownedArrays(): Array<ByteArray> = arrayOf(
        ed25519Public,
        ed25519PrivateSeed,
        x25519Public,
        x25519Private,
        mlKem1024Public,
        mlKem1024Private,
        mlDsa87Public,
        mlDsa87Private,
    )

    internal companion object {
        private const val ED25519_BYTES = 32
        private const val X25519_BYTES = 32
        private const val ML_KEM_1024_PUBLIC_BYTES = 1_568
        private const val ML_KEM_1024_PRIVATE_BYTES = 3_168
        private const val ML_DSA_87_PUBLIC_BYTES = 2_592
        private const val ML_DSA_87_PRIVATE_BYTES = 4_896

        fun capture(native: NativeIdentityKeyBundle): LocalIdentityKeyMaterial {
            val owned = arrayOfNulls<ByteArray>(8)
            return try {
                owned[0] = captureKey(native::ed25519Public, ED25519_BYTES)
                owned[1] = captureKey(native::ed25519PrivateSeed, ED25519_BYTES)
                owned[2] = captureKey(native::x25519Public, X25519_BYTES)
                owned[3] = captureKey(native::x25519Private, X25519_BYTES)
                owned[4] = captureKey(native::mlKem1024Public, ML_KEM_1024_PUBLIC_BYTES)
                owned[5] = captureKey(native::mlKem1024Private, ML_KEM_1024_PRIVATE_BYTES)
                owned[6] = captureKey(native::mlDsa87Public, ML_DSA_87_PUBLIC_BYTES)
                owned[7] = captureKey(native::mlDsa87Private, ML_DSA_87_PRIVATE_BYTES)
                LocalIdentityKeyMaterial(
                    native,
                    owned[0]!!,
                    owned[1]!!,
                    owned[2]!!,
                    owned[3]!!,
                    owned[4]!!,
                    owned[5]!!,
                    owned[6]!!,
                    owned[7]!!,
                )
            } catch (failure: Throwable) {
                owned.filterNotNull().forEach { material -> material.fill(0) }
                try {
                    native.close()
                } catch (releaseFailure: Throwable) {
                    failure.addSuppressed(releaseFailure)
                }
                if (failure is LocalIdentityException) throw failure
                if (failure is Exception) {
                    throw LocalIdentityException(LocalIdentityFailure.NATIVE_KEY_MATERIAL_INVALID, failure)
                }
                throw failure
            }
        }

        private fun captureKey(readNative: () -> ByteArray, expectedBytes: Int): ByteArray {
            val transferred = readNative()
            return try {
                if (transferred.size != expectedBytes) {
                    throw LocalIdentityException(LocalIdentityFailure.NATIVE_KEY_MATERIAL_INVALID)
                }
                transferred.copyOf()
            } finally {
                transferred.fill(0)
            }
        }
    }
}
