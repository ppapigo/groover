import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { AuthProvider } from '@/contexts/AuthContext';
import App from '@/App';
import api, { endSession, getAccessToken, setAccessToken } from '@/lib/api';

const user = { id: '11111111-1111-1111-1111-111111111111', userId: 'reviewer', name: '리뷰어', email: 'reviewer@example.com' };
const initialReview = {
  id: '22222222-2222-2222-2222-222222222222', slug: 'keyboard-review', title: '한 달 사용한 키보드',
  content: '한 달 동안 사용해 보니 조용하고 편리했습니다.', excerpt: '조용한 키보드', tags: ['디지털'],
  previewImage: null, metadata: { productName: '키보드', rating: 4, price: 59000, purchaseStatus: '직접 구매', storeName: '공식몰' },
  author: user, viewCount: 3, likeCount: 1, commentCount: 0, liked: false, status: 'PUBLISHED', createdAt: '2026-01-01T00:00:00Z',
};
let requests;
let review;
let comments;
let override;

function ok(config, data) { return { data, status: 200, statusText: 'OK', headers: {}, config }; }
function fail(config, status, message) { throw new AxiosError(message, 'ERR_BAD_REQUEST', config, null, { data: { success: false, message }, status, headers: {}, config }); }

beforeEach(() => {
  requests = [];
  review = structuredClone(initialReview);
  comments = [];
  override = null;
  api.defaults.adapter = async config => {
    const body = config.data ? JSON.parse(config.data) : undefined;
    requests.push({ method: config.method, url: config.url, params: config.params, body, authorization: config.headers.Authorization });
    if (override) {
      const result = await override(config, body);
      if (result) return result;
    }
    const url = config.url;
    if (url === '/auth/csrf') return ok(config, { data: { token: 'csrf-test' } });
    if (url === '/auth/refresh') return fail(config, 401, '인증이 필요합니다.');
    if (url === '/auth/logout') return ok(config, { success: true });
    if (url === '/auth/me') return ok(config, { data: user });
    if (['/auth/login', '/auth/register'].includes(url)) return ok(config, { data: { user, accessToken: 'new-token' } });
    if (url === '/blog/tags/popular') return ok(config, { data: [{ name: '디지털', postCount: 1 }] });
    if (url.startsWith('/blog/feed') || url === '/blog/my-posts') return ok(config, { data: { items: [review], hasMore: false, nextCursor: null } });
    if (url === '/search') return ok(config, { posts: [review] });
    if (url === '/blog/posts' && config.method === 'post') {
      review = { ...review, ...body, status: body.publish ? 'PUBLISHED' : 'DRAFT' };
      return ok(config, { data: review });
    }
    if (url === `/blog/posts/${review.id}/publish`) {
      review.status = body.publish ? 'PUBLISHED' : 'DRAFT';
      return ok(config, { data: review });
    }
    if (url === `/blog/posts/${review.id}/like`) return ok(config, { data: { liked: true, likeCount: 2 } });
    if (url === `/blog/posts/${review.id}/comments`) {
      if (config.method === 'post') {
        const comment = { id: 'comment-1', content: body.content, author: user, createdAt: review.createdAt };
        comments.push(comment);
        return ok(config, { data: comment });
      }
      return ok(config, { data: comments });
    }
    if (url.startsWith('/blog/comments/') && config.method === 'delete') { comments = []; return ok(config, null); }
    if ([`/blog/posts/${review.id}`, `/blog/posts/${review.slug}`].includes(url)) {
      if (config.method === 'put') review = { ...review, ...body, status: body.publish ? 'PUBLISHED' : review.status };
      return ok(config, { data: review });
    }
    throw new Error(`Unexpected API request: ${config.method} ${url}`);
  };
});

function open(path, authenticated = false) {
  if (authenticated) setAccessToken('test-token');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  render(<MemoryRouter initialEntries={[path]}><QueryClientProvider client={client}><AuthProvider><App /></AuthProvider></QueryClientProvider></MemoryRouter>);
  return userEvent.setup();
}

describe('React review flows against the Spring API contract', () => {
  it('returns to the protected editor after logging in with an ID', async () => {
    const action = open('/write?edit=' + review.id);
    await action.type(await screen.findByLabelText('이메일 또는 아이디'), 'reviewer');
    await action.type(screen.getByLabelText('비밀번호'), 'password123');
    await action.click(screen.getByRole('button', { name: '로그인', exact: true }));
    expect(await screen.findByRole('heading', { name: '리뷰 수정' })).toBeInTheDocument();
    expect(requests.find(request => request.url === '/auth/login').body).toEqual({ userId: 'reviewer', password: 'password123' });
    expect(getAccessToken()).toBe('new-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('uses the registration token immediately without email verification or a second login', async () => {
    const action = open('/signup');
    await action.type(await screen.findByLabelText('아이디'), 'reviewer');
    await action.type(screen.getByLabelText('이메일', { exact: true }), 'reviewer@example.com');
    await action.type(screen.getByLabelText('이름'), '리뷰어');
    await action.type(screen.getByLabelText('비밀번호'), 'password123');
    await action.click(screen.getByRole('button', { name: '회원가입', exact: true }));
    expect(await screen.findByRole('heading', { name: '리뷰어님의 기록' })).toBeInTheDocument();
    expect(requests.find(request => request.url === '/auth/register').body).toEqual({ userId: 'reviewer', email: 'reviewer@example.com', name: '리뷰어', password: 'password123' });
    expect(requests.filter(request => ['/auth/login', '/auth/register'].includes(request.url)).map(request => request.url)).toEqual(['/auth/register']);
    expect(getAccessToken()).toBe('new-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
    await action.click(screen.getByRole('link', { name: '내 리뷰', exact: true }));
    expect(await screen.findByRole('heading', { name: '내 리뷰' })).toBeInTheDocument();
    await waitFor(() => expect(requests.find(request => request.url === '/blog/my-posts')?.authorization).toBe('Bearer new-token'));
  });

  it('opens the requested editor immediately after signup', async () => {
    const action = open('/signup?redirect=%2Fwrite');
    await action.type(await screen.findByLabelText('아이디'), 'reviewer');
    await action.type(screen.getByLabelText('이메일', { exact: true }), 'reviewer@example.com');
    await action.type(screen.getByLabelText('이름'), '리뷰어');
    await action.type(screen.getByLabelText('비밀번호'), 'password123');
    await action.click(screen.getByRole('button', { name: '회원가입', exact: true }));
    expect(await screen.findByLabelText('상세 후기')).toBeInTheDocument();
    expect(requests.filter(request => ['/auth/login', '/auth/register'].includes(request.url)).map(request => request.url)).toEqual(['/auth/register']);
  });

  it('expires a rejected session after refresh is also rejected', async () => {
    override = config => { if (config.url === '/auth/me') fail(config, 401, '인증이 필요합니다.'); };
    open('/write', true);
    expect(await screen.findByLabelText('이메일 또는 아이디')).toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(requests.filter(request => request.url === '/auth/refresh')).toHaveLength(1);
    expect(getAccessToken()).toBeNull();
  });

  it('keeps a session on a temporary auth server failure and allows retry', async () => {
    override = config => { if (config.url === '/auth/me') fail(config, 503, '잠시 연결할 수 없습니다.'); };
    const action = open('/write', true);
    expect(await screen.findByRole('alert')).toHaveTextContent('잠시 연결할 수 없습니다.');
    expect(getAccessToken()).toBe('test-token');
    override = null;
    await action.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByLabelText('상세 후기')).toBeInTheDocument();
  });

  it('creates one draft, updates that same draft, and publishes with supported metadata', async () => {
    const action = open('/write', true);
    await action.type(await screen.findByLabelText('제목', { exact: true }), '새로운 리뷰');
    await action.type(screen.getByLabelText('상세 후기'), '충분히 사용한 뒤 장단점을 기록합니다.');
    await action.type(screen.getByLabelText('가격 (원)'), '59000');
    await action.selectOptions(screen.getByLabelText('평점'), '4');
    await action.type(screen.getByLabelText('한 줄 요약'), '만족스러운 사용 경험');
    await action.type(screen.getByLabelText('태그', { exact: true }), '#디지털, 사무용, 디지털');
    await action.click(screen.getByRole('button', { name: '임시저장', exact: true }));
    await screen.findByRole('heading', { name: '리뷰 수정' });
    await action.type(screen.getByLabelText('제목', { exact: true }), ' 수정');
    await action.click(screen.getByRole('button', { name: '임시저장', exact: true }));
    await screen.findByText('임시저장되었습니다.');
    await action.click(screen.getByRole('button', { name: '발행하기' }));
    expect(await screen.findByRole('heading', { name: '새로운 리뷰 수정' })).toBeInTheDocument();
    const writes = requests.filter(request => ['post', 'put'].includes(request.method) && /^\/blog\/posts(?:\/[^/]+)?$/.test(request.url));
    expect(writes.map(request => request.method)).toEqual(['post', 'put', 'put']);
    expect(writes[2].body).toMatchObject({ publish: true, excerpt: '만족스러운 사용 경험', tags: ['디지털', '사무용'], metadata: { price: 59000, rating: 4 } });
    expect(writes[2].body.metadata).not.toHaveProperty('priceRange');
    expect(requests.some(request => request.url.includes('images/upload'))).toBe(false);
  });

  it('explicitly unpublishes an existing published review when saving as a draft', async () => {
    const action = open(`/write?edit=${review.id}`, true);
    await screen.findByLabelText('상세 후기');
    await action.click(screen.getByRole('button', { name: '임시저장', exact: true }));
    await screen.findByText('임시저장되었습니다.');
    expect(requests.find(request => request.url.endsWith('/publish')).body).toEqual({ publish: false });
    expect(review.status).toBe('DRAFT');
  });

  it('loads comments by UUID after resolving a slug and handles likes and comment deletion', async () => {
    const action = open(`/blog/${review.slug}`, true);
    await screen.findByRole('heading', { name: review.title });
    await action.click(screen.getByRole('button', { name: '좋아요 1' }));
    expect(await screen.findByRole('button', { name: '좋아요 2' })).toHaveAttribute('aria-pressed', 'true');
    await action.type(await screen.findByLabelText('댓글 남기기'), '자세한 후기 감사합니다.');
    await action.click(screen.getByRole('button', { name: '댓글 등록' }));
    const comment = await screen.findByText('자세한 후기 감사합니다.');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await action.click(within(comment.closest('article')).getByRole('button', { name: '삭제' }));
    await waitFor(() => expect(screen.queryByText('자세한 후기 감사합니다.')).not.toBeInTheDocument());
    expect(requests.some(request => request.url === `/blog/posts/${review.id}/comments`)).toBe(true);
    expect(requests.some(request => request.url === `/blog/posts/${review.slug}/comments`)).toBe(false);
  });

  it('paginates by cursor and resets the feed when a tag or sort changes', async () => {
    override = config => {
      if (config.url === '/blog/feed') return ok(config, { data: config.params.cursor ? { items: [{ ...review, id: 'second', slug: 'second', title: '두 번째 리뷰' }], hasMore: false } : { items: [review], hasMore: true, nextCursor: '1' } });
      if (config.url.startsWith('/blog/feed/tag/')) return ok(config, { data: { items: [{ ...review, title: '디지털 태그 리뷰' }], hasMore: false } });
    };
    const action = open('/blog');
    await action.click(await screen.findByRole('button', { name: '리뷰 더 보기' }));
    expect(await screen.findByRole('heading', { name: '두 번째 리뷰' })).toBeInTheDocument();
    expect(requests.some(request => request.params?.cursor === '1')).toBe(true);
    await action.selectOptions(screen.getByLabelText('리뷰 정렬'), 'popular');
    await waitFor(() => expect(requests.some(request => request.url === '/blog/feed/popular')).toBe(true));
    await action.click(screen.getByRole('link', { name: '디지털', exact: true }));
    expect(await screen.findByRole('heading', { name: '디지털 태그 리뷰' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '두 번째 리뷰' })).not.toBeInTheDocument();
  });

  it('does not replace a newer search with an older response and distinguishes errors from empty results', async () => {
    let finishOld;
    override = config => {
      if (config.url !== '/search') return;
      if (config.params.q === 'old') return new Promise(resolve => { finishOld = () => resolve(ok(config, { posts: [{ ...review, title: '오래된 검색 결과' }] })); });
      if (config.params.q === 'new') return ok(config, { posts: [{ ...review, title: '최신 검색 결과' }] });
      return fail(config, 500, '검색에 실패했습니다.');
    };
    const action = open('/search?q=old');
    await waitFor(() => expect(finishOld).toBeTypeOf('function'));
    await action.clear(screen.getByLabelText('리뷰 검색'));
    await action.type(screen.getByLabelText('리뷰 검색'), 'new');
    expect(await screen.findByRole('heading', { name: '최신 검색 결과' })).toBeInTheDocument();
    finishOld();
    expect(screen.queryByText('오래된 검색 결과')).not.toBeInTheDocument();
    await action.clear(screen.getByLabelText('리뷰 검색'));
    await action.type(screen.getByLabelText('리뷰 검색'), 'failure');
    expect(await screen.findByRole('alert')).toHaveTextContent('검색에 실패했습니다.');
    expect(screen.queryByText('일치하는 리뷰가 없어요.')).not.toBeInTheDocument();
  });

  it('allows deleting your review and returns to your review list', async () => {
    const action = open(`/blog/${review.slug}`, true);
    await screen.findByRole('heading', { name: review.title });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await action.click(screen.getByRole('button', { name: '삭제', exact: true }));
    expect(await screen.findByRole('heading', { name: '내 리뷰' })).toBeInTheDocument();
    expect(requests.some(request => request.method === 'delete' && request.url === `/blog/posts/${review.id}`)).toBe(true);
  });

  it('shows a 404 for a removed messaging route without calling a legacy API', async () => {
    open('/messages');
    expect(await screen.findByRole('heading', { name: '페이지를 찾을 수 없어요.' })).toBeInTheDocument();
    expect(requests.filter(request => !request.url.startsWith('/auth/'))).toHaveLength(0);
  });

  it('restores the session after a page reload using the HttpOnly refresh cookie', async () => {
    override = config => {
      if (config.url === '/auth/refresh') return ok(config, { data: { user, accessToken: 'restored-token' } });
    };
    open('/write');
    expect(await screen.findByLabelText('상세 후기')).toBeInTheDocument();
    expect(getAccessToken()).toBe('restored-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('keeps the profile visible when server logout fails, then retries successfully', async () => {
    override = config => { if (config.url === '/auth/logout') fail(config, 503, '잠시 후 다시 시도해주세요.'); };
    const action = open('/profile', true);
    await action.click(await screen.findByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('잠시 후 다시 시도해주세요.');
    expect(getAccessToken()).toBe('test-token');
    override = null;
    await action.click(screen.getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(getAccessToken()).toBeNull());
    expect(requests.filter(request => request.url === '/auth/logout')).toHaveLength(2);
  });

  it('does not restore a user from a me response that arrives after logout', async () => {
    let finish;
    override = config => {
      if (config.url === '/auth/me') return new Promise(resolve => { finish = () => resolve(ok(config, { data: user })); });
    };
    open('/write', true);
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    await act(async () => { await endSession(); finish(); });
    expect(await screen.findByLabelText('이메일 또는 아이디')).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });
});
