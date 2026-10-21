import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReviewContent from '@/components/review/ReviewContent';
import { imageUrl } from '@/lib/reviewContent';

describe('untrusted review content', () => {
  it('renders HTML and script payloads as text', () => {
    const payload = '<script>alert(document.cookie)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">click</a>';
    const { container } = render(<ReviewContent content={payload} />);
    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(container.querySelector('script, img, a')).toBeNull();
  });
  it.each(['javascript:alert(1)', 'data:image/svg+xml,<svg onload="alert(1)"/>', 'file:///etc/passwd', '//evil.example/image'])('rejects unsafe image URL %s', value => {
    expect(imageUrl(value)).toBe('');
  });
  it('keeps supported external images and escapes their alt text', () => {
    const { container } = render(<ReviewContent content={'![<script>alert(1)</script>](https://images.example/photo.png)'} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://images.example/photo.png');
    expect(container.querySelector('script')).toBeNull();
  });
});
