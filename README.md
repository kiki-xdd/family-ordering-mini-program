# 家庭微信点菜小程序

家庭自用微信点菜系统：小程序给家人点菜，网页后台管理菜品，微信云开发保存数据和发送推送提醒。

## 主要模块

- `miniprogram/`: 微信小程序端
- `cloudfunctions/`: 微信云函数
- `admin/`: 网页后台
- `docs/superpowers/`: 设计规格和实施计划

## 本地验证

```powershell
npm test
```

后台构建：

```powershell
cd admin
npm install
npm run build
cd ..
```

## 部署

详见 [docs/deployment.md](docs/deployment.md)。

## GitHub 推送

```powershell
git push
```
