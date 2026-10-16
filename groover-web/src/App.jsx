import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import AppHeader from '@/components/layout/AppHeader';
import BottomTabBar from '@/components/layout/BottomTabBar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import HomePage from '@/pages/HomePage';
import ReviewsPage from '@/pages/ReviewsPage';
import SearchPage from '@/pages/SearchPage';
import AuthPage from '@/pages/AuthPage';
import ProfilePage from '@/pages/ProfilePage';
import MyReviewsPage from '@/pages/MyReviewsPage';
import ReviewPage from '@/pages/ReviewPage';
import WritePage from '@/pages/WritePage';

export default function App() {
  const { pathname } = useLocation();
  const isAuthPage = /^\/(login|signup)\/?$/i.test(pathname);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return <div className={`app-shell${isAuthPage ? ' app-shell--auth' : ''}`}>
    <AppHeader />
    <main id="main-content"><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/blog" element={<ReviewsPage />} />
      <Route path="/blog/:slug" element={<ReviewPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/login" element={<AuthPage key="login" />} />
      <Route path="/signup" element={<AuthPage key="signup" signup />} />
      <Route element={<AuthGuard />}>
        <Route path="/write" element={<WritePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/posts" element={<MyReviewsPage />} />
        <Route path="/profile/drafts" element={<MyReviewsPage draftsOnly />} />
      </Route>
      <Route path="*" element={<div className="page-wrap polished-empty"><h1>페이지를 찾을 수 없어요.</h1><Link to="/blog">리뷰 둘러보기</Link></div>} />
    </Routes></main>
    <BottomTabBar />
  </div>;
}
