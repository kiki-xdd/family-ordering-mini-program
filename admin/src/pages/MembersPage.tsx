import { FormEvent, useEffect, useState } from 'react';
import { AdminMember, listMembers, saveMember } from '../api/cloud';

type MemberForm = {
  _id: string;
  openid: string;
  displayName: string;
  enabled: boolean;
};

const emptyForm: MemberForm = {
  _id: '',
  openid: '',
  displayName: '',
  enabled: true
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。';
}

export default function MembersPage({ token }: { token: string }) {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    setError('');
    try {
      const result = await listMembers(token);
      setMembers(result.members);
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
      await saveMember(token, {
        _id: form._id || undefined,
        openid: form.openid,
        displayName: form.displayName,
        enabled: form.enabled
      });
      setForm(emptyForm);
      setMessage('家庭成员已保存。');
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
        <h3>{form._id ? '编辑成员' : '新增成员'}</h3>
        <label>
          微信 OpenID
          <input
            value={form.openid}
            onChange={(event) => setForm({ ...form, openid: event.target.value })}
            placeholder="家庭成员的小程序 openid"
          />
        </label>
        <label>
          昵称
          <input
            value={form.displayName}
            onChange={(event) => setForm({ ...form, displayName: event.target.value })}
            placeholder="例如：妈妈"
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
          />
          允许使用小程序
        </label>
        {error ? <p className="error-message">{error}</p> : null}
        {message ? <p className="success-message">{message}</p> : null}
        <div className="button-row">
          <button type="submit" disabled={isSaving || !form.openid.trim() || !form.displayName.trim()}>
            {isSaving ? '保存中...' : '保存'}
          </button>
          <button type="button" className="secondary-button" onClick={() => setForm(emptyForm)}>
            清空
          </button>
        </div>
      </form>

      <section className="data-panel">
        <div className="panel-heading">
          <h3>成员列表</h3>
          <button type="button" className="secondary-button" onClick={() => void load()}>
            刷新
          </button>
        </div>
        {isLoading ? <p className="muted">正在加载成员...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>昵称</th>
                <th>OpenID</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member._id}>
                  <td>{member.displayName}</td>
                  <td className="mono-cell">{member.openid}</td>
                  <td>{member.enabled ? '允许' : '停用'}</td>
                  <td>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setForm({
                        _id: member._id,
                        openid: member.openid,
                        displayName: member.displayName,
                        enabled: member.enabled
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
