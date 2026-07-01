// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package storage

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"time"
)

const (
	defaultS3Region = "us-east-1"
	s3ServiceName   = "s3"
)

type S3ObjectStoreConfig struct {
	Endpoint       string
	Bucket         string
	Region         string
	AccessKey      string
	SecretKey      string
	Prefix         string
	ForcePathStyle bool
}

type S3ObjectStore struct {
	endpoint       *url.URL
	bucket         string
	region         string
	accessKey      string
	secretKey      string
	prefix         string
	forcePathStyle bool
	client         *http.Client
	now            func() time.Time
}

func NewS3ObjectStoreFromEnv() (*S3ObjectStore, error) {
	forcePathStyle := true
	if value := strings.TrimSpace(os.Getenv("GAIACOM_S3_PATH_STYLE")); value != "" {
		parsed, err := parseBoolEnv(value)
		if err != nil {
			return nil, err
		}
		forcePathStyle = parsed
	}

	return NewS3ObjectStore(S3ObjectStoreConfig{
		Endpoint:       os.Getenv("GAIACOM_S3_ENDPOINT"),
		Bucket:         os.Getenv("GAIACOM_S3_BUCKET"),
		Region:         os.Getenv("GAIACOM_S3_REGION"),
		AccessKey:      os.Getenv("GAIACOM_S3_ACCESS_KEY"),
		SecretKey:      os.Getenv("GAIACOM_S3_SECRET_KEY"),
		Prefix:         os.Getenv("GAIACOM_S3_PREFIX"),
		ForcePathStyle: forcePathStyle,
	})
}

func NewS3ObjectStore(config S3ObjectStoreConfig) (*S3ObjectStore, error) {
	endpointValue := strings.TrimSpace(config.Endpoint)
	endpoint, err := url.Parse(endpointValue)
	if err != nil || endpoint.Scheme == "" || endpoint.Host == "" || endpoint.RawQuery != "" || endpoint.Fragment != "" {
		return nil, errors.New("invalid s3 endpoint")
	}
	if endpoint.Scheme != "http" && endpoint.Scheme != "https" {
		return nil, errors.New("invalid s3 endpoint scheme")
	}

	bucket := strings.TrimSpace(config.Bucket)
	if !validS3Bucket(bucket) {
		return nil, errors.New("invalid s3 bucket")
	}

	region := strings.TrimSpace(config.Region)
	if region == "" {
		region = defaultS3Region
	}
	if strings.ContainsAny(region, " /\t\r\n") {
		return nil, errors.New("invalid s3 region")
	}

	accessKey := strings.TrimSpace(config.AccessKey)
	secretKey := strings.TrimSpace(config.SecretKey)
	if accessKey == "" || secretKey == "" {
		return nil, errors.New("missing s3 credentials")
	}

	prefix := strings.Trim(strings.TrimSpace(config.Prefix), "/")
	if prefix != "" {
		cleanPrefix, err := cleanObjectKey(prefix)
		if err != nil {
			return nil, errors.New("invalid s3 prefix")
		}
		prefix = cleanPrefix
	}

	return &S3ObjectStore{
		endpoint:       endpoint,
		bucket:         bucket,
		region:         region,
		accessKey:      accessKey,
		secretKey:      secretKey,
		prefix:         prefix,
		forcePathStyle: config.ForcePathStyle,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		now: time.Now,
	}, nil
}

func (s *S3ObjectStore) Put(ctx context.Context, key string, src io.Reader, maxBytes int64) (int64, error) {
	if maxBytes <= 0 {
		return 0, errors.New("invalid object size limit")
	}
	cleanKey, err := cleanObjectKey(key)
	if err != nil {
		return 0, err
	}
	data, err := io.ReadAll(io.LimitReader(src, maxBytes+1))
	if err != nil {
		return 0, err
	}
	if len(data) == 0 || int64(len(data)) > maxBytes {
		return 0, errors.New("object size boundary violation")
	}

	payloadHash := sha256Hex(data)
	req, err := s.newSignedRequest(ctx, http.MethodPut, cleanKey, nil, bytes.NewReader(data), payloadHash)
	if err != nil {
		return 0, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return 0, fmt.Errorf("s3 put failed with status %d", resp.StatusCode)
	}
	return int64(len(data)), nil
}

func (s *S3ObjectStore) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	cleanKey, err := cleanObjectKey(key)
	if err != nil {
		return nil, err
	}
	req, err := s.newSignedRequest(ctx, http.MethodGet, cleanKey, nil, nil, sha256Hex(nil))
	if err != nil {
		return nil, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		_ = resp.Body.Close()
		if resp.StatusCode == http.StatusNotFound {
			return nil, os.ErrNotExist
		}
		return nil, fmt.Errorf("s3 get failed with status %d", resp.StatusCode)
	}
	return resp.Body, nil
}

func (s *S3ObjectStore) Delete(ctx context.Context, key string) error {
	cleanKey, err := cleanObjectKey(key)
	if err != nil {
		return err
	}
	req, err := s.newSignedRequest(ctx, http.MethodDelete, cleanKey, nil, nil, sha256Hex(nil))
	if err != nil {
		return err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("s3 delete failed with status %d", resp.StatusCode)
	}
	return nil
}

func (s *S3ObjectStore) DeletePrefix(ctx context.Context, prefix string) error {
	cleanPrefix, err := cleanObjectKey(prefix)
	if err != nil {
		return err
	}
	objectPrefix := s.objectKey(cleanPrefix)
	var continuationToken string
	for {
		query := url.Values{}
		query.Set("list-type", "2")
		query.Set("prefix", objectPrefix)
		if continuationToken != "" {
			query.Set("continuation-token", continuationToken)
		}

		req, err := s.newSignedBucketRequest(ctx, http.MethodGet, query, nil, sha256Hex(nil))
		if err != nil {
			return err
		}
		resp, err := s.client.Do(req)
		if err != nil {
			return err
		}
		var listing s3ListBucketResult
		decodeErr := xml.NewDecoder(io.LimitReader(resp.Body, 8*1024*1024)).Decode(&listing)
		closeErr := resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode > 299 {
			return fmt.Errorf("s3 list failed with status %d", resp.StatusCode)
		}
		if decodeErr != nil {
			return decodeErr
		}
		if closeErr != nil {
			return closeErr
		}
		for _, item := range listing.Contents {
			key := strings.TrimPrefix(item.Key, strings.TrimRight(s.prefix, "/")+"/")
			if s.prefix == "" {
				key = item.Key
			}
			if err := s.Delete(ctx, key); err != nil {
				return err
			}
		}
		if !listing.IsTruncated || listing.NextContinuationToken == "" {
			return nil
		}
		continuationToken = listing.NextContinuationToken
	}
}

func (s *S3ObjectStore) newSignedRequest(ctx context.Context, method string, key string, query url.Values, body io.Reader, payloadHash string) (*http.Request, error) {
	return s.signRequest(ctx, method, s.objectKey(key), query, body, payloadHash)
}

func (s *S3ObjectStore) newSignedBucketRequest(ctx context.Context, method string, query url.Values, body io.Reader, payloadHash string) (*http.Request, error) {
	return s.signRequest(ctx, method, "", query, body, payloadHash)
}

func (s *S3ObjectStore) signRequest(ctx context.Context, method string, key string, query url.Values, body io.Reader, payloadHash string) (*http.Request, error) {
	requestURL := s.buildURL(key, query)
	req, err := http.NewRequestWithContext(ctx, method, requestURL.String(), body)
	if err != nil {
		return nil, err
	}

	now := s.now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")
	req.Header.Set("X-Amz-Date", amzDate)
	req.Header.Set("X-Amz-Content-Sha256", payloadHash)

	canonicalURI := req.URL.EscapedPath()
	if canonicalURI == "" {
		canonicalURI = "/"
	}
	canonicalQuery := canonicalQueryString(query)
	canonicalHeaders := "host:" + req.URL.Host + "\n" +
		"x-amz-content-sha256:" + payloadHash + "\n" +
		"x-amz-date:" + amzDate + "\n"
	signedHeaders := "host;x-amz-content-sha256;x-amz-date"
	canonicalRequest := strings.Join([]string{
		method,
		canonicalURI,
		canonicalQuery,
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	}, "\n")

	credentialScope := strings.Join([]string{dateStamp, s.region, s3ServiceName, "aws4_request"}, "/")
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		credentialScope,
		sha256Hex([]byte(canonicalRequest)),
	}, "\n")
	signature := hex.EncodeToString(hmacSHA256(s.signingKey(dateStamp), []byte(stringToSign)))
	req.Header.Set("Authorization", "AWS4-HMAC-SHA256 Credential="+s.accessKey+"/"+credentialScope+", SignedHeaders="+signedHeaders+", Signature="+signature)
	return req, nil
}

func (s *S3ObjectStore) buildURL(key string, query url.Values) url.URL {
	u := *s.endpoint
	basePath := strings.TrimRight(u.EscapedPath(), "/")
	if s.forcePathStyle {
		u.Path = basePath + "/" + s.bucket
		if key != "" {
			u.Path += "/" + key
		}
	} else {
		u.Host = s.bucket + "." + u.Host
		u.Path = basePath
		if key != "" {
			u.Path += "/" + key
		}
	}
	u.RawQuery = canonicalQueryString(query)
	return u
}

func (s *S3ObjectStore) objectKey(key string) string {
	if s.prefix == "" {
		return key
	}
	return s.prefix + "/" + key
}

func (s *S3ObjectStore) signingKey(dateStamp string) []byte {
	dateKey := hmacSHA256([]byte("AWS4"+s.secretKey), []byte(dateStamp))
	regionKey := hmacSHA256(dateKey, []byte(s.region))
	serviceKey := hmacSHA256(regionKey, []byte(s3ServiceName))
	return hmacSHA256(serviceKey, []byte("aws4_request"))
}

type s3ListBucketResult struct {
	IsTruncated           bool              `xml:"IsTruncated"`
	NextContinuationToken string            `xml:"NextContinuationToken"`
	Contents              []s3ListObjectRef `xml:"Contents"`
}

type s3ListObjectRef struct {
	Key string `xml:"Key"`
}

func validS3Bucket(bucket string) bool {
	if len(bucket) < 3 || len(bucket) > 63 {
		return false
	}
	for _, r := range bucket {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '.' || r == '-' {
			continue
		}
		return false
	}
	return bucket[0] != '.' && bucket[0] != '-' && bucket[len(bucket)-1] != '.' && bucket[len(bucket)-1] != '-'
}

func parseBoolEnv(value string) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true, nil
	case "0", "false", "no", "off":
		return false, nil
	default:
		return false, errors.New("invalid boolean environment value")
	}
}

func canonicalQueryString(values url.Values) string {
	if len(values) == 0 {
		return ""
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(values))
	for _, key := range keys {
		items := append([]string(nil), values[key]...)
		sort.Strings(items)
		for _, value := range items {
			parts = append(parts, awsQueryEscape(key)+"="+awsQueryEscape(value))
		}
	}
	return strings.Join(parts, "&")
}

func awsQueryEscape(value string) string {
	escaped := url.QueryEscape(value)
	escaped = strings.ReplaceAll(escaped, "+", "%20")
	escaped = strings.ReplaceAll(escaped, "%7E", "~")
	return escaped
}

func sha256Hex(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func hmacSHA256(key []byte, data []byte) []byte {
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write(data)
	return mac.Sum(nil)
}
