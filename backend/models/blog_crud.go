package models

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/redis/go-redis/v9"
)

// BlogRepository - Blog için CRUD operations
type BlogRepository struct {
	client *redis.Client
	ctx    context.Context
}

// NewBlogRepository - Repository oluştur
func NewBlogRepository(client *redis.Client) *BlogRepository {
	return &BlogRepository{
		client: client,
		ctx:    context.Background(),
	}
}

// CREATE Operations

// CreatePost - Yeni blog yazısı ekle
func (r *BlogRepository) CreatePost(post *BlogPost) error {
	postJSON, err := post.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal blog post: %w", err)
	}

	// Pipeline ile tüm işlemleri batch'le
	pipe := r.client.Pipeline()

	// Post verisi
	pipe.Set(r.ctx, post.ID, postJSON, time.Hour*24*365)

	// Index'ler
	pipe.SAdd(r.ctx, "blog:posts:all", post.ID)
	
	// Published posts (sadece yayında olanlar)
	if post.Published {
		pipe.SAdd(r.ctx, "blog:posts:published", post.ID)
	}

	// Tags index'i
	for _, tag := range post.Tags {
		pipe.SAdd(r.ctx, "blog:tags", tag)                          // Tüm tag'ler
		tagKey := fmt.Sprintf("blog:tag:%s", tag)
		pipe.SAdd(r.ctx, tagKey, post.ID)                          // Tag başına post'lar
	}

	// Featured posts
	if post.Featured {
		pipe.SAdd(r.ctx, "blog:posts:featured", post.ID)
	}

	// Date sorted set (timeline için)
	pipe.ZAdd(r.ctx, "blog:by_date", redis.Z{
		Score:  float64(post.PublishedAt.Unix()),
		Member: post.ID,
	})

	// Views sorted set (popülerlik için)
	pipe.ZAdd(r.ctx, "blog:by_views", redis.Z{
		Score:  float64(post.ViewCount),
		Member: post.ID,
	})

	_, err = pipe.Exec(r.ctx)
	return err
}

// READ Operations

// GetPostByID - ID'ye göre post getir
func (r *BlogRepository) GetPostByID(postID string) (*BlogPost, error) {
	postJSON, err := r.client.Get(r.ctx, postID).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("blog post not found: %s", postID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get blog post: %w", err)
	}

	var post BlogPost
	err = post.FromJSON(postJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal blog post: %w", err)
	}

	return &post, nil
}

// GetPostBySlug - Slug'a göre post getir (URL'den erişim için)
func (r *BlogRepository) GetPostBySlug(slug string) (*BlogPost, error) {
	postID := "blog:" + slug
	return r.GetPostByID(postID)
}

// GetAllPosts - Tüm post'ları getir
func (r *BlogRepository) GetAllPosts() ([]BlogPost, error) {
	postIDs, err := r.client.SMembers(r.ctx, "blog:posts:all").Result()
	if err != nil {
		return nil, err
	}
	return r.getPostsByIDs(postIDs)
}

// GetPublishedPosts - Sadece yayında olan post'lar
func (r *BlogRepository) GetPublishedPosts() ([]BlogPost, error) {
	postIDs, err := r.client.SMembers(r.ctx, "blog:posts:published").Result()
	if err != nil {
		return nil, err
	}
	return r.getPostsByIDs(postIDs)
}

// GetLatestPosts - En yeni post'lar
func (r *BlogRepository) GetLatestPosts(count int) ([]BlogPost, error) {
	postIDs, err := r.client.ZRevRange(r.ctx, "blog:by_date", 0, int64(count-1)).Result()
	if err != nil {
		return nil, err
	}
	return r.getPostsByIDs(postIDs)
}

// GetPostsByTag - Tag'e göre post'lar
func (r *BlogRepository) GetPostsByTag(tag string) ([]BlogPost, error) {
	tagKey := fmt.Sprintf("blog:tag:%s", tag)
	postIDs, err := r.client.SMembers(r.ctx, tagKey).Result()
	if err != nil {
		return nil, err
	}
	return r.getPostsByIDs(postIDs)
}

// GetAllTags - Tüm tag'leri getir
func (r *BlogRepository) GetAllTags() ([]string, error) {
	tags, err := r.client.SMembers(r.ctx, "blog:tags").Result()
	if err != nil {
		return nil, err
	}
	return tags, nil
}

// UPDATE Operations

// UpdatePost - Post güncelle
func (r *BlogRepository) UpdatePost(post *BlogPost) error {
	existingPost, err := r.GetPostByID(post.ID)
	if err != nil {
		return err
	}

	post.UpdatedAt = time.Now()

	// Save updated post
	postJSON, err := post.ToJSON()
	if err != nil {
		return err
	}

	err = r.client.Set(r.ctx, post.ID, postJSON, time.Hour*24*365).Err()
	if err != nil {
		return err
	}

	// Update indexes if needed
	pipe := r.client.Pipeline()

	// Published status değişti mi?
	if existingPost.Published != post.Published {
		if post.Published {
			pipe.SAdd(r.ctx, "blog:posts:published", post.ID)
		} else {
			pipe.SRem(r.ctx, "blog:posts:published", post.ID)
		}
	}

	// Featured status değişti mi?
	if existingPost.Featured != post.Featured {
		if post.Featured {
			pipe.SAdd(r.ctx, "blog:posts:featured", post.ID)
		} else {
			pipe.SRem(r.ctx, "blog:posts:featured", post.ID)
		}
	}

	// View count değişti mi?
	if existingPost.ViewCount != post.ViewCount {
		pipe.ZAdd(r.ctx, "blog:by_views", redis.Z{
			Score:  float64(post.ViewCount),
			Member: post.ID,
		})
	}

	_, err = pipe.Exec(r.ctx)
	return err
}

// IncrementPostViews - Post görüntüleme sayısını artır
func (r *BlogRepository) IncrementPostViews(postID string) error {
	post, err := r.GetPostByID(postID)
	if err != nil {
		return err
	}

	post.IncrementViewCount()
	return r.UpdatePost(post)
}

// DELETE Operations

// DeletePost - Post sil
func (r *BlogRepository) DeletePost(postID string) error {
	post, err := r.GetPostByID(postID)
	if err != nil {
		return err
	}

	pipe := r.client.Pipeline()

	// Post verisini sil
	pipe.Del(r.ctx, postID)

	// Index'lerden çıkar
	pipe.SRem(r.ctx, "blog:posts:all", postID)
	pipe.SRem(r.ctx, "blog:posts:published", postID)
	pipe.SRem(r.ctx, "blog:posts:featured", postID)

	// Tag index'lerinden çıkar
	for _, tag := range post.Tags {
		tagKey := fmt.Sprintf("blog:tag:%s", tag)
		pipe.SRem(r.ctx, tagKey, postID)
	}

	// Sorted set'lerden çıkar
	pipe.ZRem(r.ctx, "blog:by_date", postID)
	pipe.ZRem(r.ctx, "blog:by_views", postID)

	_, err = pipe.Exec(r.ctx)
	return err
}

// Helper Methods

// getPostsByIDs - Bulk read helper
func (r *BlogRepository) getPostsByIDs(postIDs []string) ([]BlogPost, error) {
	if len(postIDs) == 0 {
		return []BlogPost{}, nil
	}

	postJSONs, err := r.client.MGet(r.ctx, postIDs...).Result()
	if err != nil {
		return nil, err
	}

	posts := make([]BlogPost, 0, len(postJSONs))
	for i, postJSON := range postJSONs {
		if postJSON == nil {
			continue
		}

		var post BlogPost
		err = post.FromJSON(postJSON.(string))
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal post %s: %w", postIDs[i], err)
		}

		posts = append(posts, post)
	}

	return posts, nil
}

// GetBlogResponse - API response format'ı
func (r *BlogRepository) GetBlogResponse(page, limit int) (*BlogResponse, error) {
	posts, err := r.GetPublishedPosts()
	if err != nil {
		return nil, err
	}

	// Date'e göre sırala (en yeni first)
	sort.Slice(posts, func(i, j int) bool {
		return posts[i].PublishedAt.After(posts[j].PublishedAt)
	})

	// Pagination
	total := len(posts)
	start := (page - 1) * limit
	end := start + limit

	if start >= total {
		posts = []BlogPost{}
	} else if end > total {
		posts = posts[start:]
	} else {
		posts = posts[start:end]
	}

	// Summary'lere çevir
	summaries := make([]BlogPostSummary, 0, len(posts))
	for _, post := range posts {
		summaries = append(summaries, post.ToSummary())
	}

	return &BlogResponse{
		Posts: summaries,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}