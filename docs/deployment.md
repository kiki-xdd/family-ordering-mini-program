# 部署说明

这份说明用于把家庭点菜小程序部署到微信云开发，并完成后台管理和微信推送配置。

## 准备工作

1. 使用微信开发者工具打开项目根目录。
2. 把 `project.config.json` 里的 `appid` 改成你的真实小程序 AppID。
3. 在微信开发者工具里开通云开发环境。
4. 确认本地依赖可以安装和构建：

```powershell
npm test
cd admin
npm install
npm run build
cd ..
```

## 云函数

上传并部署这些云函数：

- `checkMemberAccess`
- `getMenu`
- `submitOrder`
- `getOrderHistory`
- `adminLogin`
- `adminApi`

每次修改共享代码后，先在项目根目录运行：

```powershell
npm run sync:cloud-shared
```

然后重新上传相关云函数。

## 数据集合

在云数据库创建这些集合：

- `members`
- `categories`
- `dishes`
- `orders`
- `admin_config`
- `admin_sessions`
- `admin_login_attempts`
- `audit_logs`

## 管理员密码

后台登录使用 `admin_config` 集合里的密码哈希。先用本地脚本或 Node 生成哈希和盐，再写入一条配置。

示例配置结构：

```json
{
  "adminPasswordHash": "your-password-hash",
  "adminPasswordSalt": "your-password-salt",
  "pushProvider": "server_chan",
  "pushConfig": {
    "sendKey": "your-real-send-key"
  }
}
```

`adminPasswordHash` 和 `adminPasswordSalt` 必须配套生成，不要把明文密码放进数据库。

## 第一位家庭成员

先打开小程序。如果你还没有加入白名单，小程序会进入无权限页。

从云函数日志中确认自己的 `openid` 后，手动往 `members` 集合插入一条记录：

```json
{
  "openid": "your-openid",
  "displayName": "我",
  "enabled": true
}
```

之后你就可以从后台继续维护其他家庭成员。

## 菜品图片

当前后台菜品表单使用云存储 File ID。

推荐流程：

1. 在微信云开发控制台上传菜品图片。
2. 复制图片的 File ID。
3. 在后台菜品管理中粘贴到“图片 File ID”。

## 推送配置

当前实现支持 Server 酱。

在 `admin_config` 的同一条配置里保存：

```json
{
  "pushProvider": "server_chan",
  "pushConfig": {
    "sendKey": "your-real-send-key"
  }
}
```

提交订单后：

- 推送成功时，`orders.pushStatus` 会变成 `sent`。
- 未配置推送时，`orders.pushStatus` 会变成 `skipped`。
- 推送失败时，`orders.pushStatus` 会变成 `failed`，错误会写入 `orders.pushError`。
- 后台订单记录页可以点击“重试推送”。

## 后台

后台源码在 `admin/`。

本地开发：

```powershell
cd admin
npm run dev
```

生产构建：

```powershell
cd admin
npm run build
```

构建结果在 `admin/dist/`。实际部署时需要放到支持微信云开发 Web SDK 的环境中打开，否则后台会提示“微信云开发环境不可用”。

## 验收清单

1. 白名单成员能进入菜单。
2. 非白名单成员会进入无权限页。
3. 后台能登录。
4. 后台能新增和编辑分类。
5. 后台能新增和编辑菜品。
6. 后台能维护家庭成员 OpenID 白名单。
7. 小程序能看到启用分类和上架菜品。
8. 小程序能提交包含数量、单菜备注、整单备注的订单。
9. 订单保存到 `orders` 集合。
10. 配置 Server 酱后能收到微信推送。
11. 历史记录能查看自己的订单和全家订单。
12. 后台订单记录能查看最近订单，并能重试推送。
