import { FormEvent, useState } from 'react';
import { adminLogin } from './api/cloud';
import CategoriesPage from './pages/CategoriesPage';
import DishesPage from './pages/DishesPage';
import MembersPage from './pages/MembersPage';
import OrdersPage from './pages/OrdersPage';

const navItems = ['仪表盘', '分类管理', '菜品管理', '订单记录', '家庭成员'];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return '登录失败，请稍后重试。';
}

export default function App() {
  const [password, setPassword] = useState('');
  const [sessionToken, setSessionToken] = useState(
    () => localStorage.getItem('adminToken') ?? ''
  );
  const [activeNavItem, setActiveNavItem] = useState(navItems[0]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const session = await adminLogin(password);
      localStorage.setItem('adminToken', session.token);
      setSessionToken(session.token);
      setPassword('');
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function logout() {
    localStorage.removeItem('adminToken');
    setSessionToken('');
    setPassword('');
  }

  function renderWorkspace() {
    if (activeNavItem === '分类管理') {
      return <CategoriesPage token={sessionToken} />;
    }
    if (activeNavItem === '菜品管理') {
      return <DishesPage token={sessionToken} />;
    }
    if (activeNavItem === '订单记录') {
      return <OrdersPage token={sessionToken} />;
    }
    if (activeNavItem === '家庭成员') {
      return <MembersPage token={sessionToken} />;
    }

    return (
      <section className="dashboard-grid">
        <article>
          <span>今日点菜</span>
          <strong>接入订单后显示</strong>
        </article>
        <article>
          <span>常点菜品</span>
          <strong>接入统计后显示</strong>
        </article>
        <article>
          <span>家庭成员</span>
          <strong>在左侧维护白名单</strong>
        </article>
      </section>
    );
  }

  if (!sessionToken) {
    return (
      <main className="login-page">
        <form className="login-panel" onSubmit={login}>
          <h1>家庭点菜后台</h1>
          <label htmlFor="admin-password">管理员密码</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="请输入管理员密码"
          />
          {error ? <p className="error-message">{error}</p> : null}
          <button type="submit" disabled={isSubmitting || !password.trim()}>
            {isSubmitting ? '登录中...' : '登录'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar" aria-label="后台导航">
        <div className="brand">家庭点菜后台</div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              className={item === activeNavItem ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveNavItem(item)}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>
      <main className="workspace">
        <header className="workspace-header">
          <h2>{activeNavItem}</h2>
          <button type="button" className="secondary-button" onClick={logout}>
            退出
          </button>
        </header>
        <section className="workspace-body">
          {renderWorkspace()}
        </section>
      </main>
    </div>
  );
}
