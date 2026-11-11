import React from 'react';
import SetupWizard from '../../auth/SetupWizard';

/*
 * Identity setup wizard screen (VGT GLASS 2100): exact SetupWizard prop set, moved verbatim.
 */
export default function AppWizardView({auth, t}) {
  const {
    availableNodes, copiedMnemonic, derivedKeys, handleWizardRegisterIdentity, mnemonic,
    setCopiedMnemonic, setShowWizard, setWizardCustomDomain, setWizardDomain, setWizardFallbackNodes,
    setWizardGaiaUsername, setWizardStep, wizardCustomDomain, wizardDomain, wizardError,
    wizardFallbackNodes, wizardGaiaUsername, wizardStep,
  } = auth;

  return (
    <SetupWizard
        wizardStep={wizardStep}
        mnemonic={mnemonic}
        copiedMnemonic={copiedMnemonic}
        wizardGaiaUsername={wizardGaiaUsername}
        wizardDomain={wizardDomain}
        wizardCustomDomain={wizardCustomDomain}
        wizardFallbackNodes={wizardFallbackNodes}
        availableNodes={availableNodes}
        wizardError={wizardError}
        derivedKeys={derivedKeys}
        t={t}
        onCopiedMnemonicChange={setCopiedMnemonic}
        onStepChange={setWizardStep}
        onGaiaUsernameChange={setWizardGaiaUsername}
        onDomainChange={setWizardDomain}
        onCustomDomainChange={setWizardCustomDomain}
        onFallbackNodesChange={setWizardFallbackNodes}
        onRegisterIdentity={handleWizardRegisterIdentity}
        onFinish={() => setShowWizard(false)}
      />
  );
}
