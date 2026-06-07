import { FormEvent, useEffect, useState } from 'react';
import {
  AdminCategory,
  AdminDish,
  listCategories,
  listDishes,
  saveDish
} from '../api/cloud';

type DishForm = {
  _id: string;
  name: string;
  categoryId: string;
  imageFileId: string;
  price: string;
  description: string;
  sortOrder: string;
  isOnShelf: boolean;
};

const emptyForm: DishForm = {
  _id: '',
  name: '',
  categoryId: '',
  imageFileId: '',
  price: '',
  description: '',
  sortOrder: '0',
  isOnShelf: true
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。';
}

export default function DishesPage({ token }: { token: string }) {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [dishes, setDishes] = useState<AdminDish[]>([]);
  const [form, setForm] = useState<DishForm>(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    setError('');
    try {
      const [categoryResult, dishResult] = await Promise.all([
        listCategories(token),
        listDishes(token)
      ]);
      setCategories(categoryResult.categories);
      setDishes(dishResult.dishes);
      setForm((current) => ({
        ...current,
        categoryId: current.categoryId || categoryResult.categories[0]?._id || ''
      }));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  function categoryName(categoryId: string) {
    return categories.find((category) => category._id === categoryId)?.name || '未分类';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      await saveDish(token, {
        _id: form._id || undefined,
        name: form.name,
        categoryId: form.categoryId,
        imageFileId: form.imageFileId,
        price: form.price,
        description: form.description,
        sortOrder: Number(form.sortOrder),
        isOnShelf: form.isOnShelf
      });
      setForm({
        ...emptyForm,
        categoryId: categories[0]?._id || ''
      });
      setMessage('菜品已保存。');
      await load();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="management-grid wide">
      <form className="form-panel" onSubmit={submit}>
        <h3>{form._id ? '编辑菜品' : '新增菜品'}</h3>
        <label>
          菜名
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="例如：番茄炒蛋"
          />
        </label>
        <label>
          分类
          <select
            value={form.categoryId}
            onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
          >
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          图片 File ID
          <input
            value={form.imageFileId}
            onChange={(event) => setForm({ ...form, imageFileId: event.target.value })}
            placeholder="cloud://..."
          />
        </label>
        <div className="field-grid">
          <label>
            价格
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              placeholder="可留空"
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
        </div>
        <label>
          描述
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="口味、份量或家人备注"
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.isOnShelf}
            onChange={(event) => setForm({ ...form, isOnShelf: event.target.checked })}
          />
          上架菜品
        </label>
        {error ? <p className="error-message">{error}</p> : null}
        {message ? <p className="success-message">{message}</p> : null}
        <div className="button-row">
          <button
            type="submit"
            disabled={isSaving || !form.name.trim() || !form.categoryId || !form.imageFileId.trim()}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setForm({ ...emptyForm, categoryId: categories[0]?._id || '' })}
          >
            清空
          </button>
        </div>
      </form>

      <section className="data-panel">
        <div className="panel-heading">
          <h3>菜品列表</h3>
          <button type="button" className="secondary-button" onClick={() => void load()}>
            刷新
          </button>
        </div>
        {isLoading ? <p className="muted">正在加载菜品...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>菜名</th>
                <th>分类</th>
                <th>价格</th>
                <th>状态</th>
                <th>排序</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {dishes.map((dish) => (
                <tr key={dish._id}>
                  <td>{dish.name}</td>
                  <td>{categoryName(dish.categoryId)}</td>
                  <td>{dish.price === null ? '未填' : `¥${dish.price.toFixed(2)}`}</td>
                  <td>{dish.isOnShelf ? '上架' : '下架'}</td>
                  <td>{dish.sortOrder}</td>
                  <td>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setForm({
                        _id: dish._id,
                        name: dish.name,
                        categoryId: dish.categoryId,
                        imageFileId: dish.imageFileId,
                        price: dish.price === null ? '' : String(dish.price),
                        description: dish.description || '',
                        sortOrder: String(dish.sortOrder),
                        isOnShelf: dish.isOnShelf
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
