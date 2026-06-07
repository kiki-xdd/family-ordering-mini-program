import { FormEvent, useEffect, useState } from 'react';
import { AdminCategory, listCategories, saveCategory } from '../api/cloud';

type CategoryForm = {
  _id: string;
  name: string;
  sortOrder: string;
  enabled: boolean;
};

const emptyForm: CategoryForm = {
  _id: '',
  name: '',
  sortOrder: '0',
  enabled: true
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。';
}

export default function CategoriesPage({ token }: { token: string }) {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    setError('');
    try {
      const result = await listCategories(token);
      setCategories(result.categories);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      await saveCategory(token, {
        _id: form._id || undefined,
        name: form.name,
        sortOrder: Number(form.sortOrder),
        enabled: form.enabled
      });
      setForm(emptyForm);
      setMessage('分类已保存。');
      await load();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="management-grid">
      <form className="form-panel" onSubmit={submit}>
        <h3>{form._id ? '编辑分类' : '新增分类'}</h3>
        <label>
          分类名称
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="例如：家常菜"
          />
        </label>
        <label>
          排序
          <input
            type="number"
            value={form.sortOrder}
            onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
          />
          启用分类
        </label>
        {error ? <p className="error-message">{error}</p> : null}
        {message ? <p className="success-message">{message}</p> : null}
        <div className="button-row">
          <button type="submit" disabled={isSaving || !form.name.trim()}>
            {isSaving ? '保存中...' : '保存'}
          </button>
          <button type="button" className="secondary-button" onClick={() => setForm(emptyForm)}>
            清空
          </button>
        </div>
      </form>

      <section className="data-panel">
        <div className="panel-heading">
          <h3>分类列表</h3>
          <button type="button" className="secondary-button" onClick={() => void load()}>
            刷新
          </button>
        </div>
        {isLoading ? <p className="muted">正在加载分类...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>排序</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category._id}>
                  <td>{category.name}</td>
                  <td>{category.sortOrder}</td>
                  <td>{category.enabled ? '启用' : '停用'}</td>
                  <td>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setForm({
                        _id: category._id,
                        name: category.name,
                        sortOrder: String(category.sortOrder),
                        enabled: category.enabled
                      })}
                    >
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
