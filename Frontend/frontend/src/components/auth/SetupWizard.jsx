import React from 'react';
import LogoMark from '../layout/LogoMark';
import StepProgress from '../common/StepProgress';
import { useTranslation } from '../../utils/i18n';
import TermsStep from './wizard/steps/TermsStep';
import RecoveryStep from './wizard/steps/RecoveryStep';
import IdentityStep from './wizard/steps/IdentityStep';
import SecurityStep from './wizard/steps/SecurityStep';
import LaunchStep from './wizard/steps/LaunchStep';

/**
 * VGT GLASS 2100 — identity setup wizard.
 *
 * The wizard state machine and every security gate are unchanged:
 * step 1 requires all six consents, step 2 requires the seed confirmation
 * before continuing, step 3 calls the untouched registration handler, steps
 * 4/5 are informational. Only presentation and focus order changed.
 */
export default function SetupWizard({
  wizardStep,
  mnemonic,
  copiedMnemonic,
  wizardGaiaUsername,
  wizardDomain,
  wizardCustomDomain,
  wizardFallbackNodes,
  wizardError,
  availableNodes,
  onCopiedMnemonicChange,
  onStepChange,
  onGaiaUsernameChange,
  onDomainChange,
  onCustomDomainChange,
  onFallbackNodesChange,
  onRegisterIdentity,
  onFinish
}) {
  const { t } = useTranslation();

  const [checkedItems, setCheckedItems] = React.useState({
    terms_read: false,
    is_beta: false,
    no_uptime_guarantee: false,
    smtp_security_scope: false,
    credentials_responsibility: false,
    no_illegal_purposes: false
  });

  const allChecked = Object.values(checkedItems).every(value => value === true);

  const label = (key, fallback) => (t(key) || fallback).replace(/^\d+\.\s*/, '');
  const steps = [
    { key: 'terms', label: label('wizard_step_terms', 'Nutzungsbedingungen') },
    { key: 'recovery', label: label('wizard_step1', 'Backup Seed') },
    { key: 'identity', label: label('wizard_step2', 'Adresse & Server') },
    { key: 'security', label: label('onboarding_step_security', 'Schutz') },
    { key: 'launch', label: label('onboarding_step_launch', 'Start') }
  ];
  const stepIndex = wizardStep === 1 ? 0
    : wizardStep === 2 ? 1
      : wizardStep === 3 ? 2
        : wizardStep === 4 ? 3
          : 4;

  return (
    <div className="vgt-wizard">
      <div className="vgt-wizard__shell vgt-glass">
        <header className="vgt-wizard__head">
          <LogoMark compact size={30} />
          <p className="vgt-eyebrow">GaiaCom Einrichtung</p>
          <h1 className="vgt-h2">Identität einrichten</h1>
          <p className="vgt-caption">
            Die Einrichtung erzeugt lokale Schlüssel. Ohne Zustimmung zu den Beta-Bedingungen und
            ohne gesicherten Seed wird nicht fortgefahren.
          </p>
        </header>

        <StepProgress steps={steps} currentIndex={stepIndex} ariaLabel="Einrichtungsschritte" />

        <div className="vgt-wizard__body">
          {wizardStep === 1 ? (
            <TermsStep
              t={t}
              checkedItems={checkedItems}
              setCheckedItems={setCheckedItems}
              allChecked={allChecked}
              onNext={() => onStepChange(2)}
            />
          ) : wizardStep === 2 ? (
            <RecoveryStep
              t={t}
              mnemonic={mnemonic}
              copiedMnemonic={copiedMnemonic}
              onCopiedMnemonicChange={onCopiedMnemonicChange}
              onBack={() => onStepChange(1)}
              onNext={() => onStepChange(3)}
            />
          ) : wizardStep === 3 ? (
            <IdentityStep
              t={t}
              wizardGaiaUsername={wizardGaiaUsername}
              wizardDomain={wizardDomain}
              wizardCustomDomain={wizardCustomDomain}
              wizardFallbackNodes={wizardFallbackNodes}
              wizardError={wizardError}
              availableNodes={availableNodes}
              onGaiaUsernameChange={onGaiaUsernameChange}
              onDomainChange={onDomainChange}
              onCustomDomainChange={onCustomDomainChange}
              onFallbackNodesChange={onFallbackNodesChange}
              onBack={() => onStepChange(2)}
              onRegisterIdentity={onRegisterIdentity}
            />
          ) : wizardStep === 4 ? (
            <SecurityStep t={t} onBack={() => onStepChange(3)} onNext={() => onStepChange(5)} />
          ) : (
            <LaunchStep t={t} onBack={() => onStepChange(4)} onFinish={onFinish} />
          )}
        </div>
      </div>
    </div>
  );
}
