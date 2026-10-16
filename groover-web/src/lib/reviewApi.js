import api from './api';

export const reviewApi = {
  async feed({ tag, sort = 'latest', cursor, limit = 12, signal }) {
    const path = tag ? `/blog/feed/tag/${encodeURIComponent(tag)}` : `/blog/feed${sort === 'popular' ? '/popular' : ''}`;
    return (await api.get(path, { params: { cursor, limit }, signal })).data.data;
  },
  async tags(signal) { return (await api.get('/blog/tags/popular', { params: { limit: 8 }, signal })).data.data; },
  async search(query, signal) { return (await api.get('/search', { params: { q: query, limit: 20 }, signal })).data.posts; },
  async get(slug, signal) { return (await api.get(`/blog/posts/${encodeURIComponent(slug)}`, { signal })).data.data; },
  async mine(page, signal) { return (await api.get('/blog/my-posts', { params: { page, limit: 20 }, signal })).data.data; },
  async save(id, data) { return (await (id ? api.put(`/blog/posts/${id}`, data) : api.post('/blog/posts', data))).data.data; },
  async publish(id, publish) { return (await api.post(`/blog/posts/${id}/publish`, { publish })).data.data; },
  async remove(id) { await api.delete(`/blog/posts/${id}`); },
  async like(id) { return (await api.post(`/blog/posts/${id}/like`)).data.data; },
  async comments(id, signal) { return (await api.get(`/blog/posts/${id}/comments`, { signal })).data.data; },
  async comment(id, content) { return (await api.post(`/blog/posts/${id}/comments`, { content })).data.data; },
  async removeComment(id) { await api.delete(`/blog/comments/${id}`); },
};
