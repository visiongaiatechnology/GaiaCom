// STATUS: DIAMANT VGT SUPREME
package de.gaiacom.platform.security.android

import android.content.Context
import de.gaiacom.platform.security.SecureVault
import de.gaiacom.platform.security.VaultSecurityException
import java.security.SecureRandom

data class AndroidVaultPolicy(
    val keyAlias: String = "de.gaiacom.vault.device.v1",
    val authenticationWindowSeconds: Int = 300,
    val requireHardwareBacked: Boolean = true,
)

object AndroidSecureVaultFactory {
    fun hasRecord(context: Context, recordId: de.gaiacom.platform.security.VaultRecordId): Boolean =
        AndroidVaultRepository(context.applicationContext).exists(recordId.storageKey)

    fun open(
        context: Context,
        policy: AndroidVaultPolicy = AndroidVaultPolicy(),
    ): SecureVault {
        val applicationContext = context.applicationContext
        val repository = AndroidVaultRepository(applicationContext)
        val protector = createProtector(applicationContext, policy)
        return SecureVault.open(repository, protector, SecureRandom())
    }

    fun prepareHardwareKey(
        context: Context,
        policy: AndroidVaultPolicy = AndroidVaultPolicy(),
    ): de.gaiacom.platform.security.HardwareAssurance {
        val applicationContext = context.applicationContext
        return createProtector(applicationContext, policy).prepareKey()
    }

    fun resetLocalVault(
        context: Context,
        policy: AndroidVaultPolicy = AndroidVaultPolicy(),
    ) {
        val applicationContext = context.applicationContext
        val repository = AndroidVaultRepository(applicationContext)
        val protector = createProtector(applicationContext, policy)
        repository.resetStorage()
        protector.deleteKey()
    }

    fun recoverFromStrongBoxIntegrityFailure(
        context: Context,
        policy: AndroidVaultPolicy = AndroidVaultPolicy(),
    ) {
        val applicationContext = context.applicationContext
        val repository = AndroidVaultRepository(applicationContext)
        val protector = createProtector(applicationContext, policy)
        repository.resetStorage()
        protector.deleteKey()
        val preferences = applicationContext.getSharedPreferences(PREFERENCE_FILE, Context.MODE_PRIVATE)
        if (!preferences.edit().putBoolean(KEY_FORCE_TEE, true).commit() ||
            !preferences.getBoolean(KEY_FORCE_TEE, false)
        ) {
            throw VaultSecurityException("hardware fallback policy persistence failed")
        }
    }

    private fun createProtector(context: Context, policy: AndroidVaultPolicy): AndroidKeystoreKeyProtector {
        val forceTee = context.getSharedPreferences(PREFERENCE_FILE, Context.MODE_PRIVATE)
            .getBoolean(KEY_FORCE_TEE, false)
        return AndroidKeystoreKeyProtector(
            context = context,
            alias = policy.keyAlias,
            authenticationWindowSeconds = policy.authenticationWindowSeconds,
            requireHardwareBacked = policy.requireHardwareBacked,
            preferStrongBox = !forceTee,
        )
    }

    private const val PREFERENCE_FILE = "gaiacom-vault-hardware-policy-v1"
    private const val KEY_FORCE_TEE = "force-tee-after-strongbox-integrity-failure"
}
