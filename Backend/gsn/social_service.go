package gsn

import (
	"context"
	"log"
	"regexp"
	"sort"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
)

const (
	gsnNotificationListLimit = 50
	gsnNotificationPreviewMax = 120
	gsnTrendWindowHoursDefault = 168
	gsnTrendWindowHoursMin     = 1
	gsnTrendWindowHoursMax     = 720
	gsnTrendLimit              = 8
	gsnSuggestionWindowDays    = 30
	gsnNetworkLimit            = 100
)

// gsnHashtagPattern matches real hashtags in post bodies, including Unicode
// letters (German umlauts etc.) and digits. Two characters minimum keep single
// "#" characters from being reported as trends.
var gsnHashtagPattern = regexp.MustCompile(`#([\p{L}\p{N}_]{2,40})`)

// extractGsnHashtags returns the unique hashtags of one post body, preserving the
// spelling of the first occurrence.
func extractGsnHashtags(body string) []string {
	matches := gsnHashtagPattern.FindAllStringSubmatch(body, -1)
	if len(matches) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(matches))
	tags := make([]string, 0, len(matches))
	for _, match := range matches {
		tag := match[1]
		key := strings.ToLower(tag)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		tags = append(tags, tag)
	}
	return tags
}

func truncateGsnPreview(value string, max int) string {
	trimmed := strings.TrimSpace(value)
	runes := []rune(trimmed)
	if len(runes) <= max {
		return trimmed
	}
	return strings.TrimSpace(string(runes[:max])) + "…"
}

// createGsnNotification stores one real social event for a local recipient.
// Notification failures must never break the underlying action, so errors are
// logged and swallowed. Remote recipients are skipped: only local identities can
// read their notification inbox.
func (s *Service) createGsnNotification(ctx context.Context, recipientGaiaID, actorGaiaID, notificationType, postID, commentID, preview string) {
	if recipientGaiaID == "" || actorGaiaID == "" || recipientGaiaID == actorGaiaID {
		return
	}
	if _, err := s.store.FindIdentityByGaiaID(recipientGaiaID); err != nil {
		return
	}
	notification := &models.GsnNotification{
		ID:              uuid.New().String(),
		RecipientGaiaID: recipientGaiaID,
		ActorGaiaID:     actorGaiaID,
		Type:            notificationType,
		PostID:          postID,
		CommentID:       commentID,
		Preview:         truncateGsnPreview(preview, gsnNotificationPreviewMax),
		CreatedAt:       time.Now().UTC().Format(time.RFC3339),
	}
	if _, err := s.store.CreateGsnNotification(ctx, notification); err != nil {
		log.Printf("gsn notification persist failed: %v", err)
	}
}

// ListNotifications returns real notifications plus the real unread count.
func (s *Service) ListNotifications(ctx context.Context, recipientGaiaID string) ([]models.GsnNotification, int, error) {
	items, err := s.store.ListGsnNotifications(ctx, recipientGaiaID, gsnNotificationListLimit)
	if err != nil {
		return nil, 0, err
	}
	if items == nil {
		items = []models.GsnNotification{}
	}
	unread, err := s.store.UnreadGsnNotificationCount(ctx, recipientGaiaID)
	if err != nil {
		return nil, 0, err
	}
	return items, unread, nil
}

// MarkNotificationsRead marks all real notifications of one identity as read.
func (s *Service) MarkNotificationsRead(ctx context.Context, recipientGaiaID string) error {
	_, err := s.store.MarkGsnNotificationsRead(ctx, recipientGaiaID)
	return err
}

// Trends computes real hashtag trends from local posts inside the requested window.
func (s *Service) Trends(ctx context.Context, windowHours int) ([]models.GsnTrend, error) {
	if windowHours < gsnTrendWindowHoursMin || windowHours > gsnTrendWindowHoursMax {
		windowHours = gsnTrendWindowHoursDefault
	}
	since := time.Now().UTC().Add(-time.Duration(windowHours) * time.Hour).Format(time.RFC3339)
	posts, err := s.store.ListGsnPostBodiesSince(ctx, since, 5000)
	if err != nil {
		return nil, err
	}

	counts := make(map[string]int)
	lastPost := make(map[string]string)
	display := make(map[string]string)
	for _, post := range posts {
		for _, tag := range extractGsnHashtags(post.Body) {
			key := strings.ToLower(tag)
			counts[key]++
			if display[key] == "" {
				display[key] = tag
			}
			if post.Timestamp > lastPost[key] {
				lastPost[key] = post.Timestamp
			}
		}
	}

	trends := make([]models.GsnTrend, 0, len(counts))
	for key, count := range counts {
		trends = append(trends, models.GsnTrend{
			Tag:        display[key],
			PostCount:  count,
			LastPostAt: lastPost[key],
		})
	}
	sort.Slice(trends, func(i, j int) bool {
		if trends[i].PostCount != trends[j].PostCount {
			return trends[i].PostCount > trends[j].PostCount
		}
		if trends[i].LastPostAt != trends[j].LastPostAt {
			return trends[i].LastPostAt > trends[j].LastPostAt
		}
		return strings.ToLower(trends[i].Tag) < strings.ToLower(trends[j].Tag)
	})
	if len(trends) > gsnTrendLimit {
		trends = trends[:gsnTrendLimit]
	}
	return trends, nil
}

// Suggestions returns real local identities ranked by real follow/activity signals.
func (s *Service) Suggestions(ctx context.Context, requesterGaiaID string, limit int) ([]models.GsnSuggestion, error) {
	if limit <= 0 || limit > 20 {
		limit = 5
	}
	since := time.Now().UTC().Add(-gsnSuggestionWindowDays * 24 * time.Hour).Format(time.RFC3339)
	items, err := s.store.ListGsnSuggestionCandidates(ctx, requesterGaiaID, since, limit)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []models.GsnSuggestion{}
	}
	for index := range items {
		items[index].Reason = gsnSuggestionReason(items[index])
	}
	return items, nil
}

func gsnSuggestionReason(suggestion models.GsnSuggestion) string {
	switch {
	case suggestion.FollowsMe:
		return "Folgt dir"
	case suggestion.RecentPosts > 0:
		return "Kürzlich aktiv"
	case suggestion.FollowersCount > 0:
		return "Viele Follower"
	default:
		return "Neu im Netzwerk"
	}
}

// Network returns the real hydrated follower/following profiles of one identity.
func (s *Service) Network(ctx context.Context, gaiaID string) ([]models.GsnProfile, []models.GsnProfile, error) {
	followerIDs, err := s.store.ListGsnFollowerIDs(ctx, gaiaID, gsnNetworkLimit)
	if err != nil {
		return nil, nil, err
	}
	followingIDs, err := s.store.ListGsnFollowingIDs(ctx, gaiaID, gsnNetworkLimit)
	if err != nil {
		return nil, nil, err
	}
	followers := s.hydrateGsnProfiles(ctx, followerIDs)
	following := s.hydrateGsnProfiles(ctx, followingIDs)
	return followers, following, nil
}

func (s *Service) hydrateGsnProfiles(ctx context.Context, gaiaIDs []string) []models.GsnProfile {
	profiles := make([]models.GsnProfile, 0, len(gaiaIDs))
	seen := make(map[string]struct{}, len(gaiaIDs))
	for _, gaiaID := range gaiaIDs {
		if gaiaID == "" {
			continue
		}
		if _, exists := seen[gaiaID]; exists {
			continue
		}
		seen[gaiaID] = struct{}{}
		profile, err := s.store.GetGsnProfile(ctx, gaiaID)
		if err != nil || profile == nil {
			continue
		}
		profiles = append(profiles, *profile)
	}
	return profiles
}
