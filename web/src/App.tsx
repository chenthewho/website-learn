/**
 * 应用外壳与路由（react-router-dom v6）。
 * 布局：<Nav/> + <main><Routes/></main> + <Footer/>，全部包裹在 <AuthProvider> 内。
 *
 * 页面组件（Landing/Login/Register/Catalog/Reader/Redeem）由 FE-ui / FE-reader 提供，
 * 约定为「默认导出」。
 */
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Catalog from './pages/Catalog';
import Reader from './pages/Reader';
import Redeem from './pages/Redeem';

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Nav />
        {/* flex:1 让内容区撑开，使页脚吸底（#root 为 flex column） */}
        <main style={{ flex: '1 0 auto', width: '100%' }}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/reader/:id" element={<Reader />} />
            <Route path="/redeem" element={<Redeem />} />
            {/* 兜底：未知路径回首页 */}
            <Route path="*" element={<Landing />} />
          </Routes>
        </main>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  );
}
