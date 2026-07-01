// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package identity

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/core/validate"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
	"gaiacom/backend/utils"

	"github.com/cloudflare/circl/sign/mldsa/mldsa87"
)

type Service struct {
	Store repository.IdentityStore
}

type CreateIdentityInput struct {
	GaiaID       string                 `json:"gaiaId"`
	DisplayName  string                 `json:"displayName"`
	PublicRecord map[string]interface{} `json:"publicRecord"`
}

type HumanProofEnvelope struct {
	Version          string `json:"version"`
	GaiaID           string `json:"gaiaId"`
	DisplayName      string `json:"displayName"`
	ChallengeHash    string `json:"challengeHash"`
	Digest           string `json:"digest"`
	Iterations       int64  `json:"iterations"`
	DurationMs       int64  `json:"durationMs"`
	CompletedAt      int64  `json:"completedAt"`
	Algorithm        string `json:"algorithm"`
	Signature        string `json:"signature"`
	SignerPublicKey  string `json:"signerPublicKey"`
	SignatureSuite   string `json:"signatureSuite"`
	MLDSA87Signature string `json:"mldsa87Signature"`
	MLDSA87PublicKey string `json:"mldsa87PublicKey"`
}

type humanProofSignaturePayload struct {
	Version       string `json:"version"`
	GaiaID        string `json:"gaiaId"`
	DisplayName   string `json:"displayName"`
	ChallengeHash string `json:"challengeHash"`
	Digest        string `json:"digest"`
	Iterations    int64  `json:"iterations"`
	DurationMs    int64  `json:"durationMs"`
	CompletedAt   int64  `json:"completedAt"`
	Algorithm     string `json:"algorithm"`
}

const (
	humanProofVersion       = "gaia-human-proof-v1"
	humanProofAlgorithm     = "SHA-256 chained proof-of-work ceremony"
	humanProofMinDurationMs = int64(60 * 1000)
	humanProofMaxDurationMs = int64(30 * 60 * 1000)
	humanProofMaxAge        = 180 * 24 * time.Hour
	humanProofSuiteEd25519  = "Ed25519"
	humanProofSuiteHybrid   = "Ed25519+ML-DSA-87"
	mldsa87PublicKeyHexLen  = 2592 * 2
	mldsa87SignatureHexLen  = 4627 * 2
)

func NewIdentityService(store repository.IdentityStore) *Service {
	return &Service{Store: store}
}

func (s *Service) CreateIdentity(userID uuid.UUID, input CreateIdentityInput) (*models.Identity, error) {
	if userID == uuid.Nil {
		return nil, errors.New("invalid user")
	}
	if err := validate.GaiaID(input.GaiaID); err != nil {
		return nil, errors.New("invalid gaiaId")
	}
	if len(input.PublicRecord) == 0 {
		return nil, errors.New("publicRecord is required")
	}

	// Enforce limit of maximum 2 identities per user
	existing, err := s.Store.FindIdentitiesByUserID(userID)
	if err != nil {
		return nil, err
	}
	if len(existing) >= 2 {
		return nil, errors.New("maximum identity limit reached (2)")
	}

	count, err := s.Store.CountIdentitiesByGaiaID(input.GaiaID)
	if err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, errors.New("gaiaId already taken")
	}

	publicRecordBytes, err := json.Marshal(input.PublicRecord)
	if err != nil {
		return nil, fmt.Errorf("invalid public record format: %w", err)
	}

	newIdentity := models.Identity{
		ID:           uuid.New(),
		UserID:       userID,
		GaiaID:       strings.ToLower(strings.TrimSpace(input.GaiaID)),
		DisplayName:  input.DisplayName,
		PublicRecord: models.JSONB(publicRecordBytes),
		IsActive:     true,
	}

	if err := s.Store.CreateIdentity(&newIdentity); err != nil {
		return nil, err
	}

	// Dynamic Welcome Notification based on language inside newIdentity.PublicRecord
	lang := "de"
	var record struct {
		Language string `json:"language"`
	}
	if err := json.Unmarshal(newIdentity.PublicRecord, &record); err == nil && record.Language != "" {
		lang = record.Language
	}

	welcomeSubject, welcomeBody := getWelcomeMessage(lang)
	welcomePayload := map[string]interface{}{
		"type":      "system",
		"subject":   welcomeSubject,
		"body":      welcomeBody,
		"createdAt": time.Now().UTC().Format(time.RFC3339),
	}
	payloadBytes, _ := json.Marshal(welcomePayload)

	if store, ok := s.Store.(repository.Store); ok {
		welcomeMsg := &models.MessageEnvelope{
			ID:        uuid.New(),
			Type:      "system",
			Sender:    "system",
			Recipient: newIdentity.GaiaID,
			Payload:   models.JSONB(payloadBytes),
		}
		_ = store.SaveMessageEnvelopeWithInbox(context.Background(), welcomeMsg, []uuid.UUID{newIdentity.ID})
	}

	return &newIdentity, nil
}

func (s *Service) GetIdentityByGaiaID(gaiaID string) (*models.Identity, error) {
	identity, err := s.Store.FindIdentityByGaiaID(gaiaID)
	if err != nil {
		return nil, errors.New("identity not found")
	}
	return identity, nil
}

func (s *Service) BuildTrustPassport(identity *models.Identity) map[string]interface{} {
	passport := map[string]interface{}{
		"gaiaId":           identity.GaiaID,
		"fingerprint":      "",
		"trustAgeDays":     0,
		"keyHistory":       []map[string]interface{}{},
		"verifiedContacts": 0,
		"abuseScore": map[string]interface{}{
			"score":           0,
			"escalationLevel": 0,
		},
		"nodeReputation":  "local-verified",
		"isHumanVerified": false,
	}
	if !identity.CreatedAt.IsZero() {
		passport["trustAgeDays"] = int(time.Since(identity.CreatedAt).Hours() / 24)
	}

	var record struct {
		PublicKeys      map[string]string   `json:"public_keys"`
		HumanProof      *HumanProofEnvelope `json:"human_proof"`
		HumanProofCamel *HumanProofEnvelope `json:"humanProof"`
	}
	if err := json.Unmarshal(identity.PublicRecord, &record); err == nil {
		identityKey := strings.TrimSpace(record.PublicKeys["identity"])
		if identityKey != "" {
			sum := sha256.Sum256([]byte(identityKey))
			passport["fingerprint"] = hex.EncodeToString(sum[:])
			passport["keyHistory"] = []map[string]interface{}{
				{
					"type":        "identity",
					"fingerprint": hex.EncodeToString(sum[:]),
					"firstSeenAt": identity.CreatedAt,
					"lastSeenAt":  identity.UpdatedAt,
					"confirmed":   true,
					"warning":     "",
				},
			}
			if trustStore, ok := s.Store.(repository.TrustMeshStore); ok {
				score, err := trustStore.GetAbuseScore(identityKey)
				if err == nil && score != nil {
					passport["abuseScore"] = map[string]interface{}{
						"score":           score.Score,
						"escalationLevel": score.EscalationLevel,
					}
				}
			}
		}
		humanProof := record.HumanProof
		if humanProof == nil {
			humanProof = record.HumanProofCamel
		}
		if humanProof != nil {
			proofMap, err := validateHumanProofEnvelope(identity, *humanProof)
			if err == nil {
				passport["humanProof"] = proofMap
				passport["isHumanVerified"] = true
				passport["humanVerifiedAt"] = humanProof.CompletedAt
			}
		}
	}

	// Fetch active roles for the trust passport
	roles := []string{}
	if govStore, ok := s.Store.(repository.GovernanceStore); ok {
		creds, err := govStore.GetCredentialsBySubject(context.Background(), identity.GaiaID)
		if err == nil {
			now := time.Now()
			for _, cred := range creds {
				if now.After(cred.ValidUntil) || now.Before(cred.ValidFrom) {
					continue
				}
				rev, err := govStore.GetCredentialRevocation(context.Background(), cred.ID)
				if err != nil || rev != nil {
					continue
				}
				roles = append(roles, cred.Role)
			}
		}
	}
	passport["roles"] = roles

	return passport
}

func (s *Service) SaveHumanProof(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, proof HumanProofEnvelope) (*models.Identity, error) {
	if userID == uuid.Nil || identityID == uuid.Nil {
		return nil, errors.New("invalid identity scope")
	}
	identity, err := s.Store.FindIdentityByID(identityID)
	if err != nil {
		return nil, errors.New("identity not found")
	}
	if identity.UserID != userID || !identity.IsActive {
		return nil, errors.New("identity not found")
	}
	proofMap, err := validateHumanProofEnvelope(identity, proof)
	if err != nil {
		return nil, err
	}
	return s.Store.UpdateIdentityHumanProof(ctx, userID, identityID, proofMap)
}

func validateHumanProofEnvelope(identity *models.Identity, proof HumanProofEnvelope) (map[string]interface{}, error) {
	if proof.Version != humanProofVersion {
		return nil, errors.New("invalid human proof version")
	}
	if !strings.EqualFold(strings.TrimSpace(proof.GaiaID), identity.GaiaID) {
		return nil, errors.New("invalid human proof identity")
	}
	if proof.Algorithm != humanProofAlgorithm {
		return nil, errors.New("invalid human proof algorithm")
	}
	if !isFixedHex(proof.ChallengeHash, sha256.Size*2) || !isFixedHex(proof.Digest, sha256.Size*2) {
		return nil, errors.New("invalid human proof digest")
	}
	if !isFixedHex(proof.Signature, ed25519.SignatureSize*2) || !isFixedHex(proof.SignerPublicKey, ed25519.PublicKeySize*2) {
		return nil, errors.New("invalid human proof signature encoding")
	}
	if proof.Iterations <= 0 || proof.DurationMs < humanProofMinDurationMs || proof.DurationMs > humanProofMaxDurationMs {
		return nil, errors.New("invalid human proof work boundary")
	}
	completed := time.UnixMilli(proof.CompletedAt)
	now := time.Now().UTC()
	if completed.After(now.Add(5*time.Minute)) || now.Sub(completed) > humanProofMaxAge {
		return nil, errors.New("invalid human proof timestamp")
	}

	var record struct {
		PublicKeys map[string]string `json:"public_keys"`
	}
	if err := json.Unmarshal(identity.PublicRecord, &record); err != nil {
		return nil, errors.New("invalid identity public record")
	}
	identityKey := strings.TrimSpace(record.PublicKeys["identity"])
	if identityKey == "" || !strings.EqualFold(identityKey, proof.SignerPublicKey) {
		return nil, errors.New("human proof signer mismatch")
	}
	signatureSuite := strings.TrimSpace(proof.SignatureSuite)
	if signatureSuite == "" {
		signatureSuite = humanProofSuiteEd25519
	}
	if signatureSuite != humanProofSuiteEd25519 && signatureSuite != humanProofSuiteHybrid {
		return nil, errors.New("invalid human proof signature suite")
	}
	if signatureSuite == humanProofSuiteHybrid {
		mldsa87PublicKey := strings.TrimSpace(record.PublicKeys["mldsa87"])
		if mldsa87PublicKey == "" || !strings.EqualFold(mldsa87PublicKey, proof.MLDSA87PublicKey) {
			return nil, errors.New("human proof mldsa87 signer mismatch")
		}
		if !isFixedHex(proof.MLDSA87PublicKey, mldsa87PublicKeyHexLen) || !isFixedHex(proof.MLDSA87Signature, mldsa87SignatureHexLen) {
			return nil, errors.New("invalid human proof mldsa87 encoding")
		}
	}

	publicKeyBytes, err := hex.DecodeString(proof.SignerPublicKey)
	if err != nil || len(publicKeyBytes) != ed25519.PublicKeySize {
		return nil, errors.New("invalid human proof public key")
	}
	signatureBytes, err := hex.DecodeString(proof.Signature)
	if err != nil || len(signatureBytes) != ed25519.SignatureSize {
		return nil, errors.New("invalid human proof signature")
	}
	payload, err := canonicalHumanProofPayload(proof)
	if err != nil {
		return nil, err
	}
	if !ed25519.Verify(ed25519.PublicKey(publicKeyBytes), []byte(payload), signatureBytes) {
		return nil, errors.New("invalid human proof signature")
	}
	if signatureSuite == humanProofSuiteHybrid {
		mldsa87PublicKeyBytes, err := hex.DecodeString(proof.MLDSA87PublicKey)
		if err != nil || len(mldsa87PublicKeyBytes) != mldsa87.PublicKeySize {
			return nil, errors.New("invalid human proof mldsa87 public key")
		}
		mldsa87SignatureBytes, err := hex.DecodeString(proof.MLDSA87Signature)
		if err != nil || len(mldsa87SignatureBytes) != mldsa87.SignatureSize {
			return nil, errors.New("invalid human proof mldsa87 signature")
		}
		var publicKey mldsa87.PublicKey
		if err := publicKey.UnmarshalBinary(mldsa87PublicKeyBytes); err != nil {
			return nil, errors.New("invalid human proof mldsa87 public key")
		}
		if !mldsa87.Verify(&publicKey, []byte(payload), nil, mldsa87SignatureBytes) {
			return nil, errors.New("invalid human proof mldsa87 signature")
		}
	}

	return map[string]interface{}{
		"version":          proof.Version,
		"gaiaId":           proof.GaiaID,
		"displayName":      proof.DisplayName,
		"challengeHash":    proof.ChallengeHash,
		"digest":           proof.Digest,
		"iterations":       proof.Iterations,
		"durationMs":       proof.DurationMs,
		"completedAt":      proof.CompletedAt,
		"algorithm":        proof.Algorithm,
		"signature":        proof.Signature,
		"signerPublicKey":  proof.SignerPublicKey,
		"signatureSuite":   signatureSuite,
		"mldsa87Signature": proof.MLDSA87Signature,
		"mldsa87PublicKey": proof.MLDSA87PublicKey,
	}, nil
}

func canonicalHumanProofPayload(proof HumanProofEnvelope) (string, error) {
	payload := humanProofSignaturePayload{
		Version:       proof.Version,
		GaiaID:        proof.GaiaID,
		DisplayName:   proof.DisplayName,
		ChallengeHash: proof.ChallengeHash,
		Digest:        proof.Digest,
		Iterations:    proof.Iterations,
		DurationMs:    proof.DurationMs,
		CompletedAt:   proof.CompletedAt,
		Algorithm:     proof.Algorithm,
	}
	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(payload); err != nil {
		return "", err
	}
	return strings.TrimSuffix(buf.String(), "\n"), nil
}

func isFixedHex(value string, expectedLength int) bool {
	if len(value) != expectedLength {
		return false
	}
	for _, char := range value {
		if (char >= '0' && char <= '9') || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F') {
			continue
		}
		return false
	}
	return true
}

func (s *Service) ResolveRemoteIdentity(gaiaID string) (map[string]interface{}, error) {
	if err := validate.GaiaID(gaiaID); err != nil {
		return nil, err
	}

	separator := strings.LastIndex(gaiaID, ":")
	if separator == -1 {
		return nil, errors.New("invalid gaiaId format")
	}
	domain := gaiaID[separator+1:]

	if utils.IsPrivateOrLoopbackIP(domain) && !strings.Contains(domain, "localhost") {
		return nil, errors.New("resolve remote identity aborted: target is on private or local network (SSRF protection)")
	}

	scheme := "https"
	if strings.Contains(domain, "localhost") || strings.Contains(domain, "127.0.0.1") || strings.Contains(domain, "192.168.") {
		scheme = "http"
	}

	url := fmt.Sprintf("%s://%s/api/v1/public/identity/%s", scheme, domain, gaiaID)
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(url)

	if err != nil || (resp != nil && resp.StatusCode != http.StatusOK) {
		if resp != nil {
			resp.Body.Close()
			resp = nil
		}
		log.Printf("Primary node resolution failed for %s. Attempting decentralized lookup fallback...", gaiaID)
		if fedStore, ok := s.Store.(repository.FederationStore); ok {
			servers, errList := fedStore.FindAllFederationServers()
			if errList == nil {
				for _, srv := range servers {
					if srv.IsBlocked || srv.Domain == domain {
						continue
					}
					altScheme := "https"
					if strings.Contains(srv.Domain, "localhost") || strings.Contains(srv.Domain, "127.0.0.1") || strings.Contains(srv.Domain, "192.168.") {
						altScheme = "http"
					}
					altURL := fmt.Sprintf("%s://%s/api/v1/public/identity/%s", altScheme, srv.Domain, gaiaID)
					altResp, altErr := client.Get(altURL)
					if altErr == nil && altResp.StatusCode == http.StatusOK {
						resp = altResp
						err = nil
						log.Printf("Successfully resolved identity %s via alternative federated server: %s", gaiaID, srv.Domain)
						break
					}
					if altResp != nil {
						altResp.Body.Close()
					}
				}
			}
		}
	}

	if err != nil {
		return nil, fmt.Errorf("failed to fetch remote identity: %w", err)
	}
	if resp == nil {
		return nil, errors.New("remote server returned empty response")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("remote server returned status %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode remote response: %w", err)
	}

	var remoteID uuid.UUID
	if idStr, ok := result["id"].(string); ok && idStr != "" {
		remoteID, _ = uuid.Parse(idStr)
	}
	if remoteID == uuid.Nil {
		remoteID = uuid.New()
	}

	displayName := "Remote User"
	if disp, ok := result["displayName"].(string); ok && disp != "" {
		displayName = disp
	} else if disp, ok := result["displayName"]; ok {
		displayName = fmt.Sprintf("%v", disp)
	} else {
		localPart := gaiaID[1:separator]
		displayName = strings.Title(localPart)
	}

	var pubRecordStr string
	if pubRec, ok := result["publicRecord"].(string); ok {
		pubRecordStr = pubRec
	} else if pubRec, ok := result["publicRecord"]; ok {
		pubRecBytes, _ := json.Marshal(pubRec)
		pubRecordStr = string(pubRecBytes)
	}

	existsCount, err := s.Store.CountIdentitiesByGaiaID(gaiaID)
	if err == nil && existsCount == 0 {
		now := time.Now().UTC()
		stub := &models.Identity{
			ID:           remoteID,
			UserID:       uuid.Nil,
			GaiaID:       gaiaID,
			DisplayName:  displayName,
			PublicRecord: models.JSONB([]byte(pubRecordStr)),
			IsActive:     true,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		_ = s.Store.CreateIdentity(stub)
	}

	return map[string]interface{}{
		"id":           remoteID.String(),
		"gaiaId":       gaiaID,
		"gaiaID":       gaiaID,
		"displayName":  displayName,
		"publicRecord": pubRecordStr,
	}, nil
}

func (s *Service) GetIdentitiesForUser(userID uuid.UUID) ([]models.Identity, error) {
	return s.Store.FindIdentitiesByUserID(userID)
}

func (s *Service) IdentityBelongsToUser(identityID uuid.UUID, userID uuid.UUID) (bool, error) {
	return s.Store.IdentityBelongsToUser(identityID, userID)
}

var welcomeMessages = map[string][2]string{
	"de": {
		"Willkommen bei GaiaCom!",
		"Willkommen bei GaiaCom! Deine sichere, föderierte und quantenresistente Identität wurde erfolgreich erstellt. Du kannst jetzt Ende-zu-Ende verschlüsselte Nachrichten senden, Kanäle abonnieren und den Status des Netzwerks überwachen. Vielen Dank, dass du Teil von GaiaCom bist!",
	},
	"en": {
		"Welcome to GaiaCom!",
		"Welcome to GaiaCom! Your secure, federated, and quantum-resistant identity has been successfully created. You can now send end-to-end encrypted messages, subscribe to public channels, and monitor network health. Thank you for choosing GaiaCom!",
	},
	"ru": {
		"Добро пожаловать в GaiaCom!",
		"Добро пожаловать в GaiaCom! Ваша защищенная, федеративная и квантово-устойчивая идентичность успешно создана. Теперь вы можете отправлять сквозное зашифрованные сообщения, подписываться на публичные каналы и отслеживать состояние сети. Спасибо, что выбрали GaiaCom!",
	},
	"es": {
		"¡Bienvenido a GaiaCom!",
		"¡Bienvenido a GaiaCom! Tu identidad segura, federada y resistente a la computación cuántica ha sido creada con éxito. Ahora puedes enviar mensajes cifrados de extremo a extremo, suscribirte a canales públicos y supervisar el estado de la red. ¡Gracias por elegir GaiaCom!",
	},
	"fr": {
		"Bienvenue sur GaiaCom !",
		"Bienvenue sur GaiaCom ! Votre identité sécurisée, fédérée et résistante à l'informatique quantique a été créée avec succès. Vous pouvez désormais envoyer des messages chiffrés de bout en bout, vous abonner à des canaux publics et surveiller l'état du réseau. Merci d'avoir choisi GaiaCom !",
	},
	"fa": {
		"به GaiaCom خوش آمدید!",
		"به GaiaCom خوش آمدید! هویت امن، فدرال و مقاوم در برابر کوانتوم شما با موفقیت ایجاد شد. اکنون می توانید پیام های رمزگذاری شده سرتاسری ارسال کنید، در کانال های عمومی مشترک شوید و سلامت شبکه را نظارت کنید. از اینکه GaiaCom را انتخاب کردید متشکریم!",
	},
	"ja": {
		"GaiaComへようこそ！",
		"GaiaComへようこそ！安全で分散型、かつ耐量子特性を持つアイデンティティが正常に作成されました。エンドツーエンドで暗号化されたメッセージの送信、パブリックチャネルへの購読、ネットワークヘルスの監視が可能になりました。GaiaComをご利用いただきありがとうございます！",
	},
	"pt": {
		"Bem-vindo ao GaiaCom!",
		"Bem-vindo ao GaiaCom! Sua identidade segura, federada e resistente a computação quântica foi criada com sucesso. Agora você pode enviar mensagens criptografadas de ponta a ponta, assinar canais públicos e monitorar a saúde da rede. Obrigado por escolher o GaiaCom!",
	},
	"ar": {
		"مرحبًا بك في GaiaCom!",
		"مرحبًا بك في GaiaCom! تم إنشاء هويتك الآمنة والموحدة والمقاومة للكم بنجاح. يمكنك الآن إرسال رسائل مشفرة بين الطرفين، والاشتراك في القنوات العامة، ومراقبة صحة الشبكة. شكرًا لاختيارك GaiaCom!",
	},
	"zh": {
		"欢迎来到 GaiaCom！",
		"欢迎来到 GaiaCom！您的安全、联邦式和抗量子身份已成功创建。您现在可以发送端到端加密消息、订阅公共频道并监控网络健康。感谢您选择 GaiaCom！",
	},
	"hi": {
		"GaiaCom में आपका स्वागत है!",
		"GaiaCom में आपका स्वागत है! आपकी सुरक्षित, फ़ेडरेटेड और क्वांटम-प्रतिरोधी पहचान सफलतापूर्वक बना ली गई है। अब आप एंड-टू-एंड एन्क्रिप्टेड संदेश भेज सकते हैं, सार्वजनिक चैनलों की सदस्यता ले सकते हैं और नेटवर्क स्वास्थ्य की निगरानी कर सकते हैं। GaiaCom चुनने के लिए धन्यवाद!",
	},
	"tr": {
		"GaiaCom'a Hoş Geldiniz!",
		"GaiaCom'a Hoş Geldiniz! Güvenli, federe ve kuantum dirençli kimliğiniz başarıyla oluşturuldu. Artık uçtan uca şifreli mesajlar gönderebilir, genel kanallara abone olabilir ve ağ sağlığını izleyebilirsiniz. GaiaCom'u seçtiğiniz için teşekkür ederiz!",
	},
	"it": {
		"Benvenuto su GaiaCom!",
		"Benvenuto su GaiaCom! La tua identità sicura, federata e resistente ai quanti è stata creata con successo. Ora puoi inviare messaggi crittografati end-to-end, iscriverti a canali pubblici e monitorare lo stato della rete. Grazie per aver scelto GaiaCom!",
	},
	"pl": {
		"Witaj w GaiaCom!",
		"Witaj w GaiaCom! Twoja bezpieczna, zoptymalizowana pod kątem federacji i odporna na komputery kwantowe tożsamość została pomyślnie utworzona. Możesz teraz wysyłać wiadomości szyfrowane end-to-end, subskrybować kanały publiczne i monitorować stan sieci. Dziękujemy za wybór GaiaCom!",
	},
	"uk": {
		"Ласкаво просимо до GaiaCom!",
		"Ласкаво просимо до GaiaCom! Ваша безпечна, федеративна та квантово-стійка ідентичність успішно створена. Тепер ви можете надсилати наскрізь зашифровані повідомлення, підписуватися на публічні канали та відстежувати стан мережі. Дякуємо, що обрали GaiaCom!",
	},
	"ko": {
		"GaiaCom에 오신 것을 환영합니다!",
		"GaiaCom에 오신 것을 환영합니다! 귀하의 안전하고 연합된 양자 내성 신원이 성공적으로 생성되었습니다. 이제 종단 간 암호화된 메시지를 보내고, 공개 채널을 구독하며, 네트워크 상태를 모니터링할 수 있습니다. GaiaCom을 선택해 주셔서 감사합니다!",
	},
	"id": {
		"Selamat datang di GaiaCom!",
		"Selamat datang di GaiaCom! Identitas Anda yang aman, terfederasi, dan tahan kuantum telah berhasil dibuat. Anda sekarang dapat mengirim pesan terenkripsi end-to-end, berlangganan saluran publik, dan memantau kesehatan jaringan. Terima kasih telah memilih GaiaCom!",
	},
	"sq": {
		"Mirësevini në GaiaCom!",
		"Mirësevini në GaiaCom! Identiteti juaj i sigurt, i federuar dhe rezistent ndaj kuanteve u krijua me sukses. Tani mund të dërgoni mesazhe të koduara fund-për-fund, të regjistroheni në kanale publike dhe të monitoroni shëndetin e rrjetit. Faleminderit që zgjodhët GaiaCom!",
	},
}

func getWelcomeMessage(lang string) (string, string) {
	if msgs, ok := welcomeMessages[strings.ToLower(lang)]; ok {
		return msgs[0], msgs[1]
	}
	return welcomeMessages["de"][0], welcomeMessages["de"][1]
}
