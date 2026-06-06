type CloudFunctionResponse<T> = { result: T };

export type AdminSession = { token: string; expiresAt: number };

export type AdminCategory = {
  _id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminDish = {
  _id: string;
  name: string;
  categoryId: string;
  imageFileId: string;
  price: number | null;
  description: string;
  sortOrder: number;
  isOnShelf: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminMember = {
  _id: string;
  openid: string;
  displayName: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminOrderItem = {
  dishId: string;
  dishName: string;
  quantity: number;
  itemNote?: string;
  price?: number | null;
};

export type AdminOrder = {
  _id: string;
  submitterName: string;
  submitterOpenid?: string;
  orderNote?: string;
  items: AdminOrderItem[];
  totalAmount?: number | null;
  pushStatus?: string;
  createdAt: string;
};

type WxCloud = {
  callFunction<T>(options: {
    name: string;
    data?: Record<string, unknown>;
  }): Promise<CloudFunctionResponse<T>>;
};

type WxGlobal = {
  cloud?: WxCloud;
};

function getCloud(): WxCloud {
  const wx = (window as Window & { wx?: WxGlobal }).wx;

  if (!wx?.cloud) {
    throw new Error('微信云开发环境不可用，请在微信云开发环境中打开后台。');
  }

  return wx.cloud;
}

export async function adminLogin(password: string): Promise<AdminSession> {
  const response = await getCloud().callFunction<AdminSession>({
    name: 'adminLogin',
    data: { password }
  });

  return response.result;
}

export async function adminApi<T>(
  token: string,
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const response = await getCloud().callFunction<T>({
    name: 'adminApi',
    data: { token, action, payload }
  });

  return response.result;
}

export function listCategories(token: string) {
  return adminApi<{ ok: true; categories: AdminCategory[] }>(token, 'listCategories');
}

export function saveCategory(token: string, payload: Record<string, unknown>) {
  return adminApi<{ ok: true; _id: string }>(token, 'saveCategory', payload);
}

export function listDishes(token: string) {
  return adminApi<{ ok: true; dishes: AdminDish[] }>(token, 'listDishes');
}

export function saveDish(token: string, payload: Record<string, unknown>) {
  return adminApi<{ ok: true; _id: string }>(token, 'saveDish', payload);
}

export function listMembers(token: string) {
  return adminApi<{ ok: true; members: AdminMember[] }>(token, 'listMembers');
}

export function saveMember(token: string, payload: Record<string, unknown>) {
  return adminApi<{ ok: true; _id: string }>(token, 'saveMember', payload);
}

export function listOrders(token: string) {
  return adminApi<{ ok: true; orders: AdminOrder[] }>(token, 'listOrders');
}
