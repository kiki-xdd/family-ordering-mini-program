import { FormEvent, useState } from 'react';
import { adminLogin } from './api/cloud';

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
        </header>
        <section className="workspace-body">
          <p>这里将显示{activeNavItem}相关的管理内容。</p>
        </section>
      </main>
    </div>
  );
}
