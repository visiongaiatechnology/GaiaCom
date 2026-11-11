package models

// GsnNotification is one real social event addressed to a local identity.
// Entries are only created from stored follow/comment/reaction events and are
// hydrated with the actor's current GSN profile at read time.
type GsnNotification struct {
	ID               string `json:"id"`
	RecipientGaiaID  string `json:"-"`
	ActorGaiaID      string `json:"actorGaiaId"`
	ActorDisplayName string `json:"actorDisplayName"`
	ActorAvatar      string `json:"actorAvatar"`
	Type             string `json:"type"`
	PostID           string `json:"postId,omitempty"`
	CommentID        string `json:"commentId,omitempty"`
	Preview          string `json:"preview,omitempty"`
	CreatedAt        string `json:"createdAt"`
	Read             bool   `json:"read"`
}

// GsnTrend is a hashtag aggregate computed from real local posts inside a window.
type GsnTrend struct {
	Tag        string `json:"tag"`
	PostCount  int    `json:"postCount"`
	LastPostAt string `json:"lastPostAt"`
}

// GsnPostBody is the minimal projection needed for real trend aggregation.
type GsnPostBody struct {
	Body      string
	Timestamp string
}

// GsnSuggestion is a real local identity proposed as a network contact.
type GsnSuggestion struct {
	GaiaID         string `json:"gaiaId"`
	DisplayName    string `json:"displayName"`
	Avatar         string `json:"avatar"`
	FollowersCount int    `json:"followersCount"`
	FollowsMe      bool   `json:"followsMe"`
	RecentPosts    int    `json:"recentPosts"`
	Reason         string `json:"reason"`
}
