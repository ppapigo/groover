import { errorMessage } from '@/lib/api';

export default function ErrorNotice({ error, retry }) {
  if (!error) return null;
  return <div className="error-panel" role="alert">
    <p>{errorMessage(error)}</p>
    {retry && <button type="button" className="secondary-cta" onClick={() => retry()}>다시 시도</button>}
  </div>;
}
