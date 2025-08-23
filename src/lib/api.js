// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082';

// API Error handling
class APIError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// Generic API request function
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    // Network or parsing errors
    throw new APIError(
      `Network error: ${error.message}`,
      0,
      { originalError: error.message }
    );
  }
}

// ======================
// SKILLS API
// ======================

/**
 * Get all skills with categories (V1 compatible)
 * @returns {Promise<{categories: string[], skills: Array}>}
 */
export async function getSkills() {
  try {
    const response = await apiRequest('/api/skills');
    
    // Filter out empty categories - only show categories that have actual skills
    const actualCategories = [];
    const skills = response.skills || [];
    
    if (response.categories && Array.isArray(response.categories)) {
      response.categories.forEach(category => {
        // Check if this category has any skills
        const hasSkills = skills.some(skill => skill.category === category);
        if (hasSkills) {
          actualCategories.push(category);
        }
      });
    }
    
    // V1 format: {categories: [...], skills: [...]}
    return {
      categories: actualCategories,
      skills: skills
    };
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    
    // Fallback to empty data
    return {
      categories: [],
      skills: []
    };
  }
}

/**
 * Get skill categories only (V2 feature)
 * @returns {Promise<{categories: string[], count: number}>}
 */
export async function getSkillCategories() {
  try {
    const response = await apiRequest('/api/v1/skills/categories');
    return response;
  } catch (error) {
    console.error('Failed to fetch skill categories:', error);
    return { categories: [], count: 0 };
  }
}

/**
 * Get skills by specific category (V2 feature)
 * @param {string} category - Category name
 * @returns {Promise<Array>}
 */
export async function getSkillsByCategory(category) {
  try {
    const response = await apiRequest(`/api/v1/skills?category=${encodeURIComponent(category)}`);
    return response.skills || [];
  } catch (error) {
    console.error(`Failed to fetch skills for category ${category}:`, error);
    return [];
  }
}

// ======================
// PROJECTS API
// ======================

/**
 * Get all projects (V1 compatible)
 * @returns {Promise<{count: number, projects: Array}>}
 */
export async function getProjects() {
  try {
    const response = await apiRequest('/api/projects');
    
    // V1 format: {count: number, projects: [...]}
    return {
      count: response.count || 0,
      projects: response.projects || []
    };
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    
    // Fallback to empty data
    return {
      count: 0,
      projects: []
    };
  }
}

/**
 * Get latest projects (V2 feature)
 * @param {number} count - Number of projects to fetch
 * @returns {Promise<Array>}
 */
export async function getLatestProjects(count = 10) {
  try {
    const response = await apiRequest(`/api/v1/projects/latest?count=${count}`);
    return response.projects || [];
  } catch (error) {
    console.error('Failed to fetch latest projects:', error);
    return [];
  }
}

/**
 * Get popular projects (V2 feature)
 * @param {number} count - Number of projects to fetch
 * @returns {Promise<Array>}
 */
export async function getPopularProjects(count = 10) {
  try {
    const response = await apiRequest(`/api/v1/projects/popular?count=${count}`);
    return response.projects || [];
  } catch (error) {
    console.error('Failed to fetch popular projects:', error);
    return [];
  }
}

/**
 * Get project statuses (V2 feature)
 * @returns {Promise<{statuses: string[], count: number}>}
 */
export async function getProjectStatuses() {
  try {
    const response = await apiRequest('/api/v1/projects/statuses');
    return response;
  } catch (error) {
    console.error('Failed to fetch project statuses:', error);
    return { statuses: [], count: 0 };
  }
}

/**
 * Get single project by ID (V2 feature)
 * @param {string} projectId - Project ID
 * @returns {Promise<Object|null>}
 */
export async function getProjectById(projectId) {
  try {
    const response = await apiRequest(`/api/v1/projects/${encodeURIComponent(projectId)}`);
    return response.project || null;
  } catch (error) {
    console.error(`Failed to fetch project ${projectId}:`, error);
    return null;
  }
}

// ======================
// BLOG API
// ======================

/**
 * Get all blog posts
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Posts per page (default: 10)
 * @returns {Promise<{posts: Array, total: number, page: number, limit: number}>}
 */
export async function getBlogPosts(options = {}) {
  try {
    const { page = 1, limit = 10 } = options;
    const response = await apiRequest(`/api/blog/posts?page=${page}&limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    return { posts: [], total: 0, page: 1, limit: 10 };
  }
}

/**
 * Get blog post by slug
 * @param {string} slug - Post slug
 * @returns {Promise<Object|null>}
 */
export async function getBlogPostBySlug(slug) {
  try {
    if (!slug) {
      throw new Error('Slug is required');
    }
    const response = await apiRequest(`/api/blog/posts/${encodeURIComponent(slug)}`);
    return response.post || response;
  } catch (error) {
    console.error(`Failed to fetch blog post by slug "${slug}":`, error);
    return null;
  }
}

/**
 * Get all blog tags
 * @returns {Promise<{tags: Array}>}
 */
export async function getBlogTags() {
  try {
    const response = await apiRequest('/api/v1/blog/tags');
    return response;
  } catch (error) {
    console.error('Failed to fetch blog tags:', error);
    return { tags: [] };
  }
}

/**
 * Get latest blog posts
 * @param {number} limit - Number of posts to fetch (default: 5)
 * @returns {Promise<{posts: Array}>}
 */
export async function getLatestBlogPosts(limit = 5) {
  try {
    const response = await apiRequest(`/api/blog/posts/latest?limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Failed to fetch latest blog posts:', error);
    return { posts: [] };
  }
}

/**
 * Get popular blog posts
 * @param {number} limit - Number of posts to fetch (default: 5)
 * @returns {Promise<{posts: Array}>}
 */
export async function getPopularBlogPosts(limit = 5) {
  try {
    const response = await apiRequest(`/api/blog/posts/popular?limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Failed to fetch popular blog posts:', error);
    return { posts: [] };
  }
}

/**
 * Increment blog post view count
 * @param {string} postId - Post ID or slug
 * @returns {Promise<boolean>}
 */
export async function incrementBlogPostViews(postId) {
  try {
    if (!postId) {
      throw new Error('Post ID is required');
    }
    await apiRequest(`/api/blog/posts/${encodeURIComponent(postId)}/views`, {
      method: 'POST'
    });
    return true;
  } catch (error) {
    console.error(`Failed to increment views for post "${postId}":`, error);
    return false;
  }
}

// ======================
// ANALYTICS API
// ======================

/**
 * Track page visit
 * @param {string} page - Page path
 * @param {number} duration - Time spent on page (optional)
 * @returns {Promise<boolean>}
 */
export async function trackPageVisit(page, duration = 0) {
  try {
    await apiRequest('/api/v1/analytics/visit', {
      method: 'POST',
      body: JSON.stringify({ page, duration })
    });
    return true;
  } catch (error) {
    console.error('Failed to track page visit:', error);
    return false;
  }
}

/**
 * Increment site visit counter (V1 compatibility)
 * @returns {Promise<boolean>}
 */
export async function incrementSiteVisits() {
  try {
    await apiRequest('/api/counter', {
      method: 'POST'
    });
    return true;
  } catch (error) {
    console.error('Failed to increment site visits:', error);
    return false;
  }
}

/**
 * Increment project views (V1 compatibility)
 * @returns {Promise<boolean>}
 */
export async function incrementProjectViews() {
  try {
    await apiRequest('/api/projectviews', {
      method: 'POST'
    });
    return true;
  } catch (error) {
    console.error('Failed to increment project views:', error);
    return false;
  }
}

/**
 * Get analytics stats (V2 feature)
 * @returns {Promise<Object>}
 */
export async function getAnalyticsStats() {
  try {
    const response = await apiRequest('/api/v1/analytics/stats');
    return response;
  } catch (error) {
    console.error('Failed to fetch analytics stats:', error);
    return {};
  }
}


// ======================
// UTILITY FUNCTIONS
// ======================

/**
 * Check API server health
 * @returns {Promise<boolean>}
 */
export async function checkAPIHealth() {
  try {
    const response = await apiRequest('/health');
    return response.status === 'healthy';
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

/**
 * Test Redis connection via API
 * @returns {Promise<boolean>}
 */
export async function testRedisConnection() {
  try {
    const response = await apiRequest('/api/v1/redis-test');
    return response.message?.includes('successful');
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}