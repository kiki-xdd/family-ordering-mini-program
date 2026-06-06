type CloudFunctionResponse<T> = { result: T };

export type AdminSession = { token: string; expiresAt: number };

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
