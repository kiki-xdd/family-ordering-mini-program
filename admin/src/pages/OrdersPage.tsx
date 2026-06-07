import { useEffect, useState } from 'react';
import { AdminOrder, listOrders, retryOrderPush } from '../api/cloud';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '订单加载失败，请稍后重试。';
}

function formatAmount(amount: number | null | undefined) {
  return amount === null || amount === undefined ? '未计价' : `¥${amount.toFixed(2)}`;
}

export default function OrdersPage({ token }: { token: string }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [retryingOrderId, setRetryingOrderId] = useState('');

  async function load() {
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await listOrders(token);
      setOrders(result.orders);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function retry(orderId: string) {
    setRetryingOrderId(orderId);
    setError('');
    setMessage('');
    try {
      const result = await retryOrderPush(token, orderId);
      setMessage(`推送重试完成：${result.pushStatus}`);
      await load();
    } catch (retryError) {
      setError(errorMessage(retryError));
    } finally {
      setRetryingOrderId('');
    }
  }

  return (
    <section className="data-panel full-panel">
      <div className="panel-heading">
        <h3>最近订单</h3>
        <button type="button" className="secondary-button" onClick={() => void load()}>
          刷新
        </button>
      </div>
      {error ? <p className="error-message">{error}</p> : null}
      {message ? <p className="success-message">{message}</p> : null}
      {isLoading ? <p className="muted">正在加载订单...</p> : null}
      <div className="order-list">
        {orders.map((order) => (
          <article className="order-card" key={order._id}>
            <div className="order-card-header">
              <div>
                <strong>{order.submitterName}</strong>
                <p>{order.createdAt}</p>
              </div>
              <span>{formatAmount(order.totalAmount)}</span>
            </div>
            <ul>
              {order.items.map((item) => (
                <li key={`${order._id}-${item.dishId}-${item.itemNote || ''}`}>
                  {item.dishName} x{item.quantity}
                  {item.itemNote ? <small> {item.itemNote}</small> : null}
                </li>
              ))}
            </ul>
            {order.orderNote ? <p className="order-note">整单备注：{order.orderNote}</p> : null}
            {order.pushStatus ? <p className="muted">推送状态：{order.pushStatus}</p> : null}
            <button
              type="button"
              className="secondary-button retry-button"
              disabled={retryingOrderId === order._id}
              onClick={() => void retry(order._id)}
            >
              {retryingOrderId === order._id ? '重试中...' : '重试推送'}
            </button>
          </article>
        ))}
      </div>
      {!isLoading && orders.length === 0 ? <p className="muted">还没有订单。</p> : null}
    </section>
  );
}
