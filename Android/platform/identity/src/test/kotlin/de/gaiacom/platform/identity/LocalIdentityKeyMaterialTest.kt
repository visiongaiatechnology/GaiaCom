// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.identity

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotEquals
import kotlin.test.assertNotSame
import kotlin.test.assertTrue

class LocalIdentityKeyMaterialTest {
    @Test
    fun gettersReturnDefensiveCopiesAndCloseWipesEveryOwnedArray() {
        val native = RecordingNativeKeyBundle()
        val material = LocalIdentityKeyMaterial.capture(native)
        val ownedArrays = ownedArrays(material)
        assertEquals(8, ownedArrays.size)
        assertTrue(ownedArrays.all { owned -> !owned.isWiped() })
        assertTrue(native.transferredCopies.all(ByteArray::isWiped))

        val getters = listOf<() -> ByteArray>(
            material::ed25519PublicCopy,
            material::ed25519PrivateSeedCopy,
            material::x25519PublicCopy,
            material::x25519PrivateCopy,
            material::mlKem1024PublicCopy,
            material::mlKem1024PrivateCopy,
            material::mlDsa87PublicCopy,
            material::mlDsa87PrivateCopy,
        )
        getters.forEach { getter ->
            val firstCopy = getter()
            val expectedFirstByte = firstCopy[0]
            firstCopy[0] = 0
            val secondCopy = getter()
            assertNotSame(firstCopy, secondCopy)
            assertEquals(expectedFirstByte, secondCopy[0])
            assertNotEquals(firstCopy[0], secondCopy[0])
            firstCopy.fill(0)
            secondCopy.fill(0)
        }

        material.close()
        material.close()

        assertEquals(1, native.closeCount)
        assertTrue(ownedArrays.all(ByteArray::isWiped))
        assertTrue(native.sources.all(ByteArray::isWiped))
        val failure = assertFailsWith<LocalIdentityException> { material.ed25519PublicCopy() }
        assertEquals(LocalIdentityFailure.MATERIAL_CLOSED, failure.failure)
    }

    @Test
    fun invalidNativeKeyLengthClosesNativeBundleAndWipesTransfers() {
        val native = RecordingNativeKeyBundle(invalidEd25519Public = true)

        val failure = assertFailsWith<LocalIdentityException> {
            LocalIdentityKeyMaterial.capture(native)
        }

        assertEquals(LocalIdentityFailure.NATIVE_KEY_MATERIAL_INVALID, failure.failure)
        assertEquals(1, native.closeCount)
        assertTrue(native.sources.all(ByteArray::isWiped))
        assertTrue(native.transferredCopies.all(ByteArray::isWiped))
    }

    @Test
    fun nativeReleaseFailureCannotPreventKotlinMaterialWipe() {
        val native = RecordingNativeKeyBundle(releaseFailure = IllegalStateException("release failed"))
        val material = LocalIdentityKeyMaterial.capture(native)
        val ownedArrays = ownedArrays(material)

        val failure = assertFailsWith<LocalIdentityException> { material.close() }

        assertEquals(LocalIdentityFailure.NATIVE_RELEASE_FAILED, failure.failure)
        assertEquals(1, native.closeCount)
        assertTrue(ownedArrays.all(ByteArray::isWiped))
        assertTrue(native.sources.all(ByteArray::isWiped))
        material.close()
        assertEquals(1, native.closeCount)
    }

    private fun ownedArrays(material: LocalIdentityKeyMaterial): List<ByteArray> =
        material.javaClass.declaredFields
            .filter { field -> field.type == ByteArray::class.java }
            .map { field ->
                field.isAccessible = true
                field.get(material) as ByteArray
            }
}
