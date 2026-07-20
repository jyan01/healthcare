import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/Login/LoginPage';
import { MemberListPage } from '../pages/MemberList/MemberListPage';
import { MemberDetailPage } from '../pages/MemberDetail/MemberDetailPage';

/** 로그인 직후 진입 지점 — 의사는 회원목록, 환자는 본인 상세화면으로 분기 (docs/SCREEN_DESIGN.md 2.2) */
function HomeRedirect() {
  const { member } = useAuth();
  if (!member) return null;
  return member.memberType === 'P' ? (
    <Navigate to={`/members/${member.memberId}`} replace />
  ) : (
    <Navigate to="/members" replace />
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/members" element={<MemberListPage />} />
        <Route path="/members/:memberId" element={<MemberDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
