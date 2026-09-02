// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.identity

import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotSame
import kotlin.test.assertTrue

class LocalIdentityServiceTest {
    @Test
    fun validationUsesAndWipesACopyWithoutMutatingCallerBytes() {
        val callerMnemonic = mnemonicBytes()
        val original = callerMnemonic.copyOf()
        val binding = RecordingIdentityBinding(RecordingNativeKeyBundle(), validationResult = true)
        val service = DefaultLocalIdentityService(binding)

        assertTrue(service.validateMnemonic(callerMnemonic))

        val transferred = requireNotNull(binding.validationInput)
        assertNotSame(callerMnemonic, transferred)
        assertTrue(transferred.isWiped())
        assertContentEquals(original, callerMnemonic)
        original.fill(0)
        callerMnemonic.fill(0)
    }

    @Test
    fun validationFailureStillWipesTheLocalCopy() {
        val callerMnemonic = mnemonicBytes()
        val original = callerMnemonic.copyOf()
        val binding = RecordingIdentityBinding(RecordingNativeKeyBundle()).apply {
            validationFailure = IllegalStateException("native validation unavailable")
        }
        val service = DefaultLocalIdentityService(binding)

        val failure = assertFailsWith<LocalIdentityException> {
            service.validateMnemonic(callerMnemonic)
        }

        assertEquals(LocalIdentityFailure.VALIDATION_UNAVAILABLE, failure.failure)
        assertTrue(requireNotNull(binding.validationInput).isWiped())
        assertContentEquals(original, callerMnemonic)
        original.fill(0)
        callerMnemonic.fill(0)
    }

    @Test
    fun derivationWipesItsCopyAndLeavesCallerBytesUntouched() {
        val callerMnemonic = mnemonicBytes()
        val original = callerMnemonic.copyOf()
        val native = RecordingNativeKeyBundle()
        val binding = RecordingIdentityBinding(native)
        val service = DefaultLocalIdentityService(binding)

        val material = service.deriveIdentity(callerMnemonic)
        try {
            assertTrue(requireNotNull(binding.derivationInput).isWiped())
            assertContentEquals(original, callerMnemonic)
            assertTrue(native.transferredCopies.all(ByteArray::isWiped))
        } finally {
            material.close()
            original.fill(0)
            callerMnemonic.fill(0)
        }
    }

    @Test
    fun invalidLengthIsRejectedBeforeCallingTheNativeBinding() {
        val native = RecordingNativeKeyBundle()
        val binding = RecordingIdentityBinding(native)
        val service = DefaultLocalIdentityService(binding)
        val oversized = ByteArray(257) { 0x41 }
        val original = oversized.copyOf()

        assertFalse(service.validateMnemonic(oversized))
        val failure = assertFailsWith<LocalIdentityException> { service.deriveIdentity(oversized) }

        assertEquals(LocalIdentityFailure.INVALID_MNEMONIC, failure.failure)
        assertEquals(null, binding.validationInput)
        assertEquals(null, binding.derivationInput)
        assertContentEquals(original, oversized)
        original.fill(0)
        oversized.fill(0)
    }

    @Test
    fun privateKeyImportWipesAllBindingCopiesAndPreservesCallerBuffers() {
        val caller = listOf(
            ByteArray(32) { 0x11 },
            ByteArray(32) { 0x22 },
            ByteArray(3_168) { 0x33 },
            ByteArray(4_896) { 0x44 },
        )
        val originals = caller.map { material -> material.copyOf() }
        val binding = RecordingIdentityBinding(RecordingNativeKeyBundle())
        val service = DefaultLocalIdentityService(binding)

        service.importIdentity(caller[0], caller[1], caller[2], caller[3]).use {
            assertTrue(requireNotNull(binding.importInputs).all(ByteArray::isWiped))
            caller.indices.forEach { index -> assertContentEquals(originals[index], caller[index]) }
        }

        originals.forEach { material -> material.fill(0) }
        caller.forEach { material -> material.fill(0) }
    }

    private fun mnemonicBytes(): ByteArray = ByteArray(64) { index -> (index + 1).toByte() }
}
