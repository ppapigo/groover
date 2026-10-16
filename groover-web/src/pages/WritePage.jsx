import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { reviewApi } from '@/lib/reviewApi';
import { imageUrl } from '@/lib/reviewContent';
import ErrorNotice from '@/components/ErrorNotice';
import ReviewContent from '@/components/review/ReviewContent';

export default function WritePage() {
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['reviews', 'edit', editId, user.id],
    queryFn: ({ signal }) => reviewApi.get(editId, signal),
    enabled: Boolean(editId),
  });
  if (editId && query.isPending) return <div className="full-loading" role="status">작성 중인 리뷰를 불러오는 중…</div>;
  if (editId && query.error) return <div className="form-page"><ErrorNotice error={query.error} retry={query.refetch} /></div>;
  if (editId && query.data.author.id !== user.id) return <div className="form-page error-panel" role="alert">본인의 리뷰만 수정할 수 있습니다.</div>;
  return <ReviewEditor key={editId || 'new'} review={editId ? query.data : null} />;
}

function ReviewEditor({ review }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { user } = useAuth();
  const savedId = useRef(review?.id);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState({
    title: review?.title || '', content: review?.content || '', excerpt: review?.excerpt || '',
    tags: review?.tags?.join(', ') || '', previewImage: review?.previewImage || '',
    productName: review?.metadata?.productName || '', storeName: review?.metadata?.storeName || '',
    price: review?.metadata?.price ?? '', rating: review?.metadata?.rating ?? '', purchaseStatus: review?.metadata?.purchaseStatus || '',
  });
  const field = name => ({ value: form[name], onChange: event => { setForm(current => ({ ...current, [name]: event.target.value })); setNotice(''); } });

  async function save(event) {
    event.preventDefault();
    if (saving.current) return;
    const publish = event.nativeEvent.submitter?.value === 'publish';
    const tags = [...new Set(form.tags.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean))];
    setError(null);
    setNotice('');
    if (!form.title.trim() || form.content.trim().length < 10) { setError('제목과 10자 이상의 본문을 입력해주세요.'); return; }
    if (tags.length > 10 || tags.some(tag => tag.length > 40)) { setError('태그는 각 40자 이하로 최대 10개까지 입력해주세요.'); return; }
    if (form.previewImage && !imageUrl(form.previewImage)) { setError('사진은 http 또는 https 주소로 입력해주세요.'); return; }
    saving.current = true;
    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(), content: form.content.trim(), excerpt: form.excerpt.trim(), tags,
        previewImage: form.previewImage.trim() || null, publish,
        metadata: { productName: form.productName.trim(), storeName: form.storeName.trim(), purchaseStatus: form.purchaseStatus,
          price: form.price === '' ? null : Number(form.price), rating: form.rating === '' ? null : Number(form.rating) },
      };
      let saved = await reviewApi.save(savedId.current, payload);
      savedId.current = saved.id;
      // Updating a published review with publish:false does not unpublish it in the Spring API.
      if (!publish && saved.status === 'PUBLISHED') saved = await reviewApi.publish(saved.id, false);
      client.setQueryData(['reviews', 'edit', saved.id, user.id], saved);
      await client.invalidateQueries({ queryKey: ['reviews'] });
      client.invalidateQueries({ queryKey: ['tags'] });
      if (publish) navigate(`/blog/${saved.slug}`);
      else { setNotice('임시저장되었습니다.'); navigate(`/write?edit=${saved.id}`, { replace: true }); }
    } catch (err) { setError(err); }
    finally { saving.current = false; setBusy(false); }
  }

  return <div className="form-page editor-page">
    <span className="section-label">WRITE WITH GROOVER</span><h1>{review ? '리뷰 수정' : '새 리뷰 작성'}</h1><p className="muted">직접 경험한 장점과 아쉬운 점을 함께 기록해보세요.</p>
    <form className="stack-form" onSubmit={save}>
      <fieldset disabled={busy}>
        <label>제목<input required maxLength={200} {...field('title')} /></label>
        <div className="form-grid"><label>제품명<input maxLength={120} {...field('productName')} /></label><label>구매처<input maxLength={100} {...field('storeName')} /></label></div>
        <div className="form-grid"><label>가격 (원)<input type="number" min="0" step="0.01" {...field('price')} /></label><label>평점<select {...field('rating')}><option value="">선택 안 함</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}점</option>)}</select></label></div>
        <label>구매 상태<select {...field('purchaseStatus')}><option value="">선택 안 함</option>{[...new Set(['직접 구매', '협찬', '구매함', '구매완료', '고민중', '비추천', form.purchaseStatus])].filter(Boolean).map(status => <option key={status}>{status}</option>)}</select></label>
        <label>한 줄 요약<input maxLength={300} {...field('excerpt')} /></label>
        <label>대표 사진 URL<input type="url" maxLength={500} placeholder="https://…" {...field('previewImage')} /></label>
        {imageUrl(form.previewImage) && <img className="editor-image" src={imageUrl(form.previewImage)} alt="대표 사진 미리보기" />}
        <label>상세 후기<textarea required minLength={10} maxLength={50000} rows={12} {...field('content')} /></label>
        <p className="muted">10자 이상 작성해주세요. 본문에 사진을 넣으려면 ![설명](https://사진주소) 형식을 사용할 수 있어요.</p>
        <label>태그<input {...field('tags')} placeholder="키보드, 사무용, 한 달 사용기" /></label><p className="muted">쉼표로 구분해 최대 10개까지 입력해주세요.</p>
      </fieldset>
      <ErrorNotice error={error} />{notice && <p role="status" className="success-notice">{notice}</p>}
      <div className="review-actions"><button className="secondary-cta" type="button" onClick={() => setPreview(value => !value)}>{preview ? '미리보기 닫기' : '본문 미리보기'}</button><button className="secondary-cta" type="submit" value="draft" disabled={busy}>임시저장</button><button className="primary-cta" type="submit" value="publish" disabled={busy}>{busy ? '저장 중…' : '발행하기'}</button></div>
    </form>
    {preview && <section className="editor-preview"><h2>{form.title || '제목 없음'}</h2><ReviewContent content={form.content} /></section>}
  </div>;
}
