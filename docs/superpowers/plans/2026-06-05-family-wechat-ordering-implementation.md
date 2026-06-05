# 家庭微信点菜小程序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable version of a family WeChat ordering mini program with WeChat Cloud Development, a web admin, dish images, member whitelist, order history, and external push notifications.

**Architecture:** Use a native WeChat mini program for family ordering, WeChat cloud functions as the only trusted backend boundary, cloud database/storage for data and images, and a Vite + React web admin for desktop management. Keep shared validation and formatting logic in small modules used by cloud function tests and admin code.

**Tech Stack:** WeChat Mini Program native WXML/WXSS/JS, WeChat Cloud Development, Node.js cloud functions, Vite, React, TypeScript, Vitest, ESLint, Git.

---

## File Structure

- `project.config.json`: WeChat developer tool project configuration.
- `miniprogram/app.js`: Mini program bootstrap and cloud initialization.
- `miniprogram/app.json`: Page routing and window configuration.
- `miniprogram/app.wxss`: Global mini program styles.
- `miniprogram/utils/api.js`: Mini program cloud function wrapper.
- `miniprogram/utils/cart.js`: Cart state helpers.
- `miniprogram/pages/no-access/*`: No-permission screen.
- `miniprogram/pages/menu/*`: Left-category/right-dish ordering page.
- `miniprogram/pages/confirm/*`: Submit confirmation page.
- `miniprogram/pages/history/*`: My records and family records.
- `cloudfunctions/shared/domain.js`: Shared data shaping, validation, totals, push message formatting.
- `cloudfunctions/shared/adminAuth.js`: Admin password/session helpers.
- `cloudfunctions/checkMemberAccess/index.js`: Member whitelist check.
- `cloudfunctions/getMenu/index.js`: Menu query.
- `cloudfunctions/submitOrder/index.js`: Order creation and push trigger.
- `cloudfunctions/getOrderHistory/index.js`: History query.
- `cloudfunctions/adminLogin/index.js`: Admin login.
- `cloudfunctions/adminApi/index.js`: Admin category, dish, member, order, retry actions.
- `cloudfunctions/*/package.json`: Per-function dependencies.
- `admin/package.json`: Web admin dependencies and scripts.
- `admin/src/main.tsx`: React entry.
- `admin/src/App.tsx`: Admin layout and route selection.
- `admin/src/api/cloud.ts`: Admin API wrapper.
- `admin/src/components/*`: Reusable admin UI.
- `admin/src/pages/*`: Dashboard, categories, dishes, orders, members, login.
- `tests/domain.test.mjs`: Local tests for shared validation and formatting.
- `tests/admin-auth.test.mjs`: Local tests for admin auth helpers.
- `.env.example`: Document required local configuration keys without secrets.
- `README.md`: Setup, local development, deployment, and Git workflow notes.

## Commit Rhythm

Commit after each task with the exact message shown. Keep secrets out of Git. Push after stable milestones, not after every tiny local experiment.

---

### Task 1: Project Skeleton And Tooling

**Files:**
- Create: `project.config.json`
- Create: `miniprogram/app.js`
- Create: `miniprogram/app.json`
- Create: `miniprogram/app.wxss`
- Create: `cloudfunctions/shared/domain.js`
- Create: `tests/domain.test.mjs`
- Create: `package.json`
- Create: `.env.example`
- Create: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Create root package scripts**

Create `package.json`:

```json
{
  "name": "family-ordering-mini-program",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "lint": "node --check cloudfunctions/shared/domain.js && node --check cloudfunctions/shared/adminAuth.js"
  },
  "devDependencies": {}
}
```

- [ ] **Step 2: Add environment documentation**

Create `.env.example`:

```text
WECHAT_CLOUD_ENV_ID=your-cloud-env-id
ADMIN_PASSWORD=change-this-password
PUSH_PROVIDER=server_chan
PUSH_SEND_KEY=replace-with-real-key
```

- [ ] **Step 3: Update `.gitignore` for generated and secret files**

Ensure `.gitignore` contains:

```gitignore
.superpowers/
node_modules/
dist/
build/
coverage/
.env
.env.*
!.env.example
*.log
.DS_Store
Thumbs.db
```

- [ ] **Step 4: Create WeChat project config**

Create `project.config.json`:

```json
{
  "description": "家庭微信点菜小程序",
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "postcss": true,
    "minified": true
  },
  "compileType": "miniprogram",
  "appid": "touristappid",
  "projectname": "family-ordering-mini-program",
  "condition": {}
}
```

- [ ] **Step 5: Create mini program shell**

Create `miniprogram/app.js`:

```js
App({
  globalData: {
    cloudReady: false,
    member: null
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error('当前微信版本不支持云开发');
      return;
    }
    wx.cloud.init({
      traceUser: true
    });
    this.globalData.cloudReady = true;
  }
});
```

Create `miniprogram/app.json`:

```json
{
  "pages": [
    "pages/menu/index",
    "pages/confirm/index",
    "pages/history/index",
    "pages/no-access/index"
  ],
  "window": {
    "navigationBarTitleText": "家里点菜",
    "navigationBarBackgroundColor": "#0f766e",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#f7f8fa"
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

Create `miniprogram/app.wxss`:

```css
page {
  min-height: 100%;
  background: #f7f8fa;
  color: #172026;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.page {
  min-height: 100vh;
  box-sizing: border-box;
}
```

- [ ] **Step 6: Create shared domain module**

Create `cloudfunctions/shared/domain.js`:

```js
function normalizePrice(price) {
  if (price === undefined || price === null || price === '') return null;
  const value = Number(price);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('INVALID_PRICE');
  }
  return Math.round(value * 100) / 100;
}

function normalizeQuantity(quantity) {
  const value = Number(quantity);
  if (!Number.isInteger(value) || value < 1 || value > 99) {
    throw new Error('INVALID_QUANTITY');
  }
  return value;
}

function buildOrderItems(selectedItems, dishesById) {
  return selectedItems.map((item) => {
    const dish = dishesById.get(item.dishId);
    if (!dish || !dish.isOnShelf) {
      throw new Error('DISH_UNAVAILABLE');
    }
    return {
      dishId: dish._id,
      dishName: dish.name,
      imageFileId: dish.imageFileId || '',
      price: normalizePrice(dish.price),
      quantity: normalizeQuantity(item.quantity),
      itemNote: String(item.itemNote || '').trim(),
      categoryId: dish.categoryId
    };
  });
}

function calculateTotalAmount(items) {
  const hasUnpricedItem = items.some((item) => item.price === null);
  if (hasUnpricedItem) return null;
  const cents = items.reduce((sum, item) => {
    return sum + Math.round(item.price * 100) * item.quantity;
  }, 0);
  return cents / 100;
}

function formatPushMessage(order) {
  const lines = [
    `点菜人：${order.submitterName}`,
    `时间：${order.createdAt}`,
    '菜品：'
  ];
  for (const item of order.items) {
    const note = item.itemNote ? `（${item.itemNote}）` : '';
    lines.push(`- ${item.dishName} x${item.quantity}${note}`);
  }
  if (order.orderNote) lines.push(`整单备注：${order.orderNote}`);
  if (order.totalAmount !== null && order.totalAmount !== undefined) {
    lines.push(`合计：¥${order.totalAmount.toFixed(2)}`);
  }
  return lines.join('\n');
}

module.exports = {
  normalizePrice,
  normalizeQuantity,
  buildOrderItems,
  calculateTotalAmount,
  formatPushMessage
};
```

- [ ] **Step 7: Write failing domain tests**

Create `tests/domain.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import domain from '../cloudfunctions/shared/domain.js';

const {
  buildOrderItems,
  calculateTotalAmount,
  formatPushMessage
} = domain;

test('buildOrderItems snapshots available dishes with quantity and note', () => {
  const dishesById = new Map([
    ['dish-1', {
      _id: 'dish-1',
      name: '番茄炒蛋',
      imageFileId: 'cloud://image',
      price: 12,
      categoryId: 'cat-1',
      isOnShelf: true
    }]
  ]);

  const items = buildOrderItems([
    { dishId: 'dish-1', quantity: 2, itemNote: '少油' }
  ], dishesById);

  assert.deepEqual(items, [{
    dishId: 'dish-1',
    dishName: '番茄炒蛋',
    imageFileId: 'cloud://image',
    price: 12,
    quantity: 2,
    itemNote: '少油',
    categoryId: 'cat-1'
  }]);
});

test('calculateTotalAmount returns null when any dish has no price', () => {
  assert.equal(calculateTotalAmount([
    { price: 12, quantity: 1 },
    { price: null, quantity: 1 }
  ]), null);
});

test('formatPushMessage includes member, dishes, notes, and total', () => {
  const message = formatPushMessage({
    submitterName: '妈妈',
    createdAt: '2026-06-05 18:30',
    orderNote: '晚上吃',
    totalAmount: 24,
    items: [
      { dishName: '番茄炒蛋', quantity: 2, itemNote: '少油' }
    ]
  });

  assert.match(message, /点菜人：妈妈/);
  assert.match(message, /番茄炒蛋 x2（少油）/);
  assert.match(message, /整单备注：晚上吃/);
  assert.match(message, /合计：¥24.00/);
});
```

- [ ] **Step 8: Run tests**

Run:

```powershell
npm test
```

Expected:

```text
# pass 3
```

- [ ] **Step 9: Create README**

Create `README.md`:

```markdown
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

## GitHub 推送

```powershell
git push
```
```

- [ ] **Step 10: Commit**

```powershell
git add .gitignore package.json project.config.json miniprogram cloudfunctions/shared tests .env.example README.md
git commit -m "chore: scaffold mini program project"
```

---

### Task 2: Member Access And Menu Cloud Functions

**Files:**
- Create: `cloudfunctions/checkMemberAccess/index.js`
- Create: `cloudfunctions/checkMemberAccess/package.json`
- Create: `cloudfunctions/getMenu/index.js`
- Create: `cloudfunctions/getMenu/package.json`
- Modify: `cloudfunctions/shared/domain.js`
- Test: `tests/domain.test.mjs`

- [ ] **Step 1: Add menu shaping helper**

Add to `cloudfunctions/shared/domain.js` before `module.exports`:

```js
function shapeMenu(categories, dishes) {
  const enabledCategories = categories
    .filter((category) => category.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const onShelfDishes = dishes
    .filter((dish) => dish.isOnShelf)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((dish) => ({
      _id: dish._id,
      name: dish.name,
      categoryId: dish.categoryId,
      imageFileId: dish.imageFileId || '',
      price: normalizePrice(dish.price),
      description: dish.description || '',
      sortOrder: dish.sortOrder
    }));

  return {
    categories: enabledCategories.map((category) => ({
      _id: category._id,
      name: category.name,
      sortOrder: category.sortOrder
    })),
    dishes: onShelfDishes
  };
}
```

Add `shapeMenu` to `module.exports`.

- [ ] **Step 2: Add menu shaping test**

Append to `tests/domain.test.mjs`:

```js
test('shapeMenu hides disabled categories and off-shelf dishes', () => {
  const { shapeMenu } = domain;
  const menu = shapeMenu([
    { _id: 'cat-2', name: '汤类', sortOrder: 2, enabled: true },
    { _id: 'cat-1', name: '家常菜', sortOrder: 1, enabled: true },
    { _id: 'cat-3', name: '隐藏', sortOrder: 3, enabled: false }
  ], [
    { _id: 'dish-1', name: '番茄炒蛋', categoryId: 'cat-1', price: '', imageFileId: '', description: '', sortOrder: 2, isOnShelf: true },
    { _id: 'dish-2', name: '下架菜', categoryId: 'cat-1', price: 8, imageFileId: '', description: '', sortOrder: 1, isOnShelf: false }
  ]);

  assert.deepEqual(menu.categories.map((category) => category.name), ['家常菜', '汤类']);
  assert.deepEqual(menu.dishes.map((dish) => dish.name), ['番茄炒蛋']);
  assert.equal(menu.dishes[0].price, null);
});
```

- [ ] **Step 3: Run domain tests**

Run:

```powershell
npm test
```

Expected:

```text
# pass 4
```

- [ ] **Step 4: Create `checkMemberAccess` cloud function**

Create `cloudfunctions/checkMemberAccess/package.json`:

```json
{
  "name": "checkMemberAccess",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

Create `cloudfunctions/checkMemberAccess/index.js`:

```js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const result = await db.collection('members')
    .where({ openid: OPENID, enabled: true })
    .limit(1)
    .get();

  const member = result.data[0];
  return {
    allowed: Boolean(member),
    openid: OPENID,
    member: member ? {
      _id: member._id,
      displayName: member.displayName
    } : null
  };
};
```

- [ ] **Step 5: Create `getMenu` cloud function**

Create `cloudfunctions/getMenu/package.json`:

```json
{
  "name": "getMenu",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

Create `cloudfunctions/getMenu/index.js`:

```js
const cloud = require('wx-server-sdk');
const { shapeMenu } = require('../shared/domain');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function assertMemberAccess(openid) {
  const result = await db.collection('members')
    .where({ openid, enabled: true })
    .limit(1)
    .get();
  if (!result.data[0]) {
    const error = new Error('NO_ACCESS');
    error.code = 'NO_ACCESS';
    throw error;
  }
  return result.data[0];
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  await assertMemberAccess(OPENID);

  const [categoryResult, dishResult] = await Promise.all([
    db.collection('categories').where({ enabled: true }).orderBy('sortOrder', 'asc').get(),
    db.collection('dishes').where({ isOnShelf: true }).orderBy('sortOrder', 'asc').get()
  ]);

  return {
    ok: true,
    menu: shapeMenu(categoryResult.data, dishResult.data)
  };
};
```

- [ ] **Step 6: Commit**

```powershell
git add cloudfunctions/checkMemberAccess cloudfunctions/getMenu cloudfunctions/shared/domain.js tests/domain.test.mjs
git commit -m "feat: add member access and menu functions"
```

---

### Task 3: Mini Program Ordering UI

**Files:**
- Create: `miniprogram/utils/api.js`
- Create: `miniprogram/utils/cart.js`
- Create: `miniprogram/pages/no-access/index.js`
- Create: `miniprogram/pages/no-access/index.json`
- Create: `miniprogram/pages/no-access/index.wxml`
- Create: `miniprogram/pages/no-access/index.wxss`
- Create: `miniprogram/pages/menu/index.js`
- Create: `miniprogram/pages/menu/index.json`
- Create: `miniprogram/pages/menu/index.wxml`
- Create: `miniprogram/pages/menu/index.wxss`
- Test: `tests/domain.test.mjs`

- [ ] **Step 1: Create mini program API wrapper**

Create `miniprogram/utils/api.js`:

```js
function callFunction(name, data = {}) {
  return wx.cloud.callFunction({ name, data })
    .then((response) => response.result);
}

module.exports = {
  checkMemberAccess: () => callFunction('checkMemberAccess'),
  getMenu: () => callFunction('getMenu'),
  submitOrder: (payload) => callFunction('submitOrder', payload),
  getOrderHistory: (payload) => callFunction('getOrderHistory', payload)
};
```

- [ ] **Step 2: Create cart helper**

Create `miniprogram/utils/cart.js`:

```js
function addDish(items, dish) {
  const existing = items.find((item) => item.dishId === dish._id);
  if (existing) {
    return items.map((item) => item.dishId === dish._id
      ? { ...item, quantity: item.quantity + 1 }
      : item);
  }
  return items.concat({
    dishId: dish._id,
    dishName: dish.name,
    imageFileId: dish.imageFileId,
    price: dish.price,
    quantity: 1,
    itemNote: ''
  });
}

function decreaseDish(items, dishId) {
  return items
    .map((item) => item.dishId === dishId
      ? { ...item, quantity: item.quantity - 1 }
      : item)
    .filter((item) => item.quantity > 0);
}

function updateItemNote(items, dishId, itemNote) {
  return items.map((item) => item.dishId === dishId
    ? { ...item, itemNote }
    : item);
}

function countItems(items) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

module.exports = {
  addDish,
  decreaseDish,
  updateItemNote,
  countItems
};
```

- [ ] **Step 3: Create no-access page**

Create `miniprogram/pages/no-access/index.json`:

```json
{
  "navigationBarTitleText": "无法使用"
}
```

Create `miniprogram/pages/no-access/index.wxml`:

```xml
<view class="page no-access">
  <view class="panel">
    <view class="title">暂时不能点菜</view>
    <view class="text">你的微信账号还不在家庭成员白名单里，请联系管理员添加。</view>
  </view>
</view>
```

Create `miniprogram/pages/no-access/index.wxss`:

```css
.no-access {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}

.panel {
  width: 100%;
  padding: 48rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.08);
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}

.text {
  color: #64748b;
  line-height: 1.7;
}
```

Create `miniprogram/pages/no-access/index.js`:

```js
Page({});
```

- [ ] **Step 4: Create menu page logic**

Create `miniprogram/pages/menu/index.js`:

```js
const api = require('../../utils/api');
const cart = require('../../utils/cart');

Page({
  data: {
    loading: true,
    categories: [],
    dishes: [],
    activeCategoryId: '',
    selectedItems: [],
    selectedCount: 0
  },

  async onLoad() {
    const access = await api.checkMemberAccess();
    if (!access.allowed) {
      wx.redirectTo({ url: '/pages/no-access/index' });
      return;
    }

    const result = await api.getMenu();
    const categories = result.menu.categories;
    this.setData({
      loading: false,
      categories,
      dishes: result.menu.dishes,
      activeCategoryId: categories[0] ? categories[0]._id : ''
    });
  },

  selectCategory(event) {
    this.setData({ activeCategoryId: event.currentTarget.dataset.id });
  },

  addDish(event) {
    const dish = this.data.dishes.find((item) => item._id === event.currentTarget.dataset.id);
    const selectedItems = cart.addDish(this.data.selectedItems, dish);
    this.setData({
      selectedItems,
      selectedCount: cart.countItems(selectedItems)
    });
  },

  decreaseDish(event) {
    const selectedItems = cart.decreaseDish(this.data.selectedItems, event.currentTarget.dataset.id);
    this.setData({
      selectedItems,
      selectedCount: cart.countItems(selectedItems)
    });
  },

  openConfirm() {
    if (this.data.selectedItems.length === 0) return;
    wx.setStorageSync('selectedItems', this.data.selectedItems);
    wx.navigateTo({ url: '/pages/confirm/index' });
  }
});
```

- [ ] **Step 5: Create menu page markup**

Create `miniprogram/pages/menu/index.json`:

```json
{
  "navigationBarTitleText": "家里点菜"
}
```

Create `miniprogram/pages/menu/index.wxml`:

```xml
<view class="page menu-page">
  <view wx:if="{{loading}}" class="loading">加载中...</view>
  <view wx:else class="menu-layout">
    <scroll-view class="categories" scroll-y>
      <view
        wx:for="{{categories}}"
        wx:key="_id"
        class="category {{activeCategoryId === item._id ? 'active' : ''}}"
        data-id="{{item._id}}"
        bindtap="selectCategory"
      >{{item.name}}</view>
    </scroll-view>

    <scroll-view class="dish-list" scroll-y>
      <view
        wx:for="{{dishes}}"
        wx:key="_id"
        wx:if="{{item.categoryId === activeCategoryId}}"
        class="dish-row"
      >
        <image class="dish-image" src="{{item.imageFileId}}" mode="aspectFill" />
        <view class="dish-info">
          <view class="dish-name">{{item.name}}</view>
          <view class="dish-desc">{{item.description}}</view>
          <view wx:if="{{item.price !== null}}" class="dish-price">¥{{item.price}}</view>
        </view>
        <view class="quantity-actions">
          <button size="mini" data-id="{{item._id}}" bindtap="decreaseDish">-</button>
          <button size="mini" data-id="{{item._id}}" bindtap="addDish">+</button>
        </view>
      </view>
    </scroll-view>
  </view>

  <view class="cart-bar" bindtap="openConfirm">
    <view>已选 {{selectedCount}} 份</view>
    <view class="submit">提交点菜</view>
  </view>
</view>
```

- [ ] **Step 6: Create menu page styles**

Create `miniprogram/pages/menu/index.wxss`:

```css
.menu-page {
  padding-bottom: 112rpx;
}

.loading {
  padding: 48rpx;
  color: #64748b;
}

.menu-layout {
  display: grid;
  grid-template-columns: 176rpx 1fr;
  height: calc(100vh - 112rpx);
}

.categories {
  background: #eef2f7;
}

.category {
  padding: 28rpx 16rpx;
  text-align: center;
  color: #475569;
  font-size: 28rpx;
}

.category.active {
  color: #0f766e;
  background: #ffffff;
  font-weight: 700;
}

.dish-list {
  padding: 20rpx;
  box-sizing: border-box;
}

.dish-row {
  display: flex;
  gap: 20rpx;
  padding: 18rpx;
  margin-bottom: 18rpx;
  border-radius: 16rpx;
  background: #ffffff;
}

.dish-image {
  width: 128rpx;
  height: 128rpx;
  border-radius: 12rpx;
  background: #e2e8f0;
}

.dish-info {
  flex: 1;
  min-width: 0;
}

.dish-name {
  font-weight: 700;
  font-size: 30rpx;
}

.dish-desc {
  margin-top: 8rpx;
  color: #64748b;
  font-size: 24rpx;
}

.dish-price {
  margin-top: 12rpx;
  color: #0f766e;
  font-weight: 700;
}

.quantity-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.cart-bar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-radius: 16rpx;
  color: #ffffff;
  background: #0f766e;
  box-shadow: 0 12rpx 32rpx rgba(15, 118, 110, 0.25);
}

.submit {
  font-weight: 700;
}
```

- [ ] **Step 7: Manual verify in WeChat Developer Tools**

Open the project folder in WeChat Developer Tools. Expected:

- App launches to menu page.
- Unknown users are redirected to no-access page until a matching member is inserted in cloud database.
- With mock data in cloud database, left categories and right dish rows display.

- [ ] **Step 8: Commit**

```powershell
git add miniprogram
git commit -m "feat: add mini program menu page"
```

---

### Task 4: Submit Order And History

**Files:**
- Create: `cloudfunctions/submitOrder/index.js`
- Create: `cloudfunctions/submitOrder/package.json`
- Create: `cloudfunctions/getOrderHistory/index.js`
- Create: `cloudfunctions/getOrderHistory/package.json`
- Create: `miniprogram/pages/confirm/index.js`
- Create: `miniprogram/pages/confirm/index.json`
- Create: `miniprogram/pages/confirm/index.wxml`
- Create: `miniprogram/pages/confirm/index.wxss`
- Create: `miniprogram/pages/history/index.js`
- Create: `miniprogram/pages/history/index.json`
- Create: `miniprogram/pages/history/index.wxml`
- Create: `miniprogram/pages/history/index.wxss`

- [ ] **Step 1: Create `submitOrder` package**

Create `cloudfunctions/submitOrder/package.json`:

```json
{
  "name": "submitOrder",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 2: Create `submitOrder` cloud function**

Create `cloudfunctions/submitOrder/index.js`:

```js
const cloud = require('wx-server-sdk');
const {
  buildOrderItems,
  calculateTotalAmount,
  formatPushMessage
} = require('../shared/domain');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

async function getMember(openid) {
  const result = await db.collection('members')
    .where({ openid, enabled: true })
    .limit(1)
    .get();
  const member = result.data[0];
  if (!member) throw new Error('NO_ACCESS');
  return member;
}

async function sendPush(order) {
  const configResult = await db.collection('admin_config').limit(1).get();
  const config = configResult.data[0];
  if (!config || !config.pushConfig || !config.pushConfig.sendKey) {
    return { status: 'skipped', error: 'PUSH_NOT_CONFIGURED' };
  }

  const message = formatPushMessage(order);
  const response = await cloud.callContainer ? null : null;
  return { status: 'pending_provider', error: '', message };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const member = await getMember(OPENID);
  const selectedItems = Array.isArray(event.items) ? event.items : [];
  if (selectedItems.length === 0) throw new Error('EMPTY_ORDER');

  const dishIds = selectedItems.map((item) => item.dishId);
  const dishResult = await db.collection('dishes')
    .where({ _id: _.in(dishIds), isOnShelf: true })
    .get();
  const dishesById = new Map(dishResult.data.map((dish) => [dish._id, dish]));
  const items = buildOrderItems(selectedItems, dishesById);
  const now = new Date().toISOString();
  const order = {
    submitterOpenid: OPENID,
    submitterName: member.displayName,
    items,
    orderNote: String(event.orderNote || '').trim(),
    totalAmount: calculateTotalAmount(items),
    pushStatus: 'pending',
    pushError: '',
    createdAt: now
  };

  const addResult = await db.collection('orders').add({ data: order });
  const savedOrder = { ...order, _id: addResult._id };

  try {
    const pushResult = await sendPush(savedOrder);
    await db.collection('orders').doc(addResult._id).update({
      data: {
        pushStatus: pushResult.status,
        pushError: pushResult.error || ''
      }
    });
    return { ok: true, orderId: addResult._id, pushStatus: pushResult.status };
  } catch (error) {
    await db.collection('orders').doc(addResult._id).update({
      data: {
        pushStatus: 'failed',
        pushError: error.message
      }
    });
    return { ok: true, orderId: addResult._id, pushStatus: 'failed' };
  }
};
```

- [ ] **Step 3: Create `getOrderHistory` cloud function**

Create `cloudfunctions/getOrderHistory/package.json`:

```json
{
  "name": "getOrderHistory",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

Create `cloudfunctions/getOrderHistory/index.js`:

```js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function assertMember(openid) {
  const result = await db.collection('members')
    .where({ openid, enabled: true })
    .limit(1)
    .get();
  if (!result.data[0]) throw new Error('NO_ACCESS');
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  await assertMember(OPENID);

  const scope = event.scope === 'family' ? 'family' : 'mine';
  const query = scope === 'family' ? {} : { submitterOpenid: OPENID };
  const result = await db.collection('orders')
    .where(query)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  return { ok: true, scope, orders: result.data };
};
```

- [ ] **Step 4: Create confirm page**

Create `miniprogram/pages/confirm/index.json`:

```json
{
  "navigationBarTitleText": "确认点菜"
}
```

Create `miniprogram/pages/confirm/index.js`:

```js
const api = require('../../utils/api');

Page({
  data: {
    items: [],
    orderNote: '',
    submitting: false
  },

  onLoad() {
    this.setData({ items: wx.getStorageSync('selectedItems') || [] });
  },

  updateOrderNote(event) {
    this.setData({ orderNote: event.detail.value });
  },

  updateItemNote(event) {
    const dishId = event.currentTarget.dataset.id;
    const itemNote = event.detail.value;
    this.setData({
      items: this.data.items.map((item) => item.dishId === dishId ? { ...item, itemNote } : item)
    });
  },

  async submit() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      await api.submitOrder({
        items: this.data.items,
        orderNote: this.data.orderNote
      });
      wx.removeStorageSync('selectedItems');
      wx.showToast({ title: '已提交' });
      wx.redirectTo({ url: '/pages/history/index' });
    } catch (error) {
      wx.showToast({ title: '提交失败', icon: 'none' });
      this.setData({ submitting: false });
    }
  }
});
```

Create `miniprogram/pages/confirm/index.wxml`:

```xml
<view class="page confirm-page">
  <view wx:for="{{items}}" wx:key="dishId" class="confirm-item">
    <view class="name">{{item.dishName}} x{{item.quantity}}</view>
    <input
      class="note-input"
      placeholder="这道菜备注"
      value="{{item.itemNote}}"
      data-id="{{item.dishId}}"
      bindinput="updateItemNote"
    />
  </view>
  <textarea class="order-note" placeholder="整单备注" value="{{orderNote}}" bindinput="updateOrderNote" />
  <button class="submit-button" loading="{{submitting}}" bindtap="submit">确认提交</button>
</view>
```

Create `miniprogram/pages/confirm/index.wxss`:

```css
.confirm-page {
  padding: 24rpx;
}

.confirm-item,
.order-note {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 20rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #ffffff;
}

.name {
  font-weight: 700;
  margin-bottom: 16rpx;
}

.note-input {
  padding: 16rpx;
  background: #f8fafc;
  border-radius: 12rpx;
}

.order-note {
  min-height: 180rpx;
}

.submit-button {
  margin-top: 24rpx;
  background: #0f766e;
  color: #ffffff;
}
```

- [ ] **Step 5: Create history page**

Create `miniprogram/pages/history/index.json`:

```json
{
  "navigationBarTitleText": "历史记录"
}
```

Create `miniprogram/pages/history/index.js`:

```js
const api = require('../../utils/api');

Page({
  data: {
    scope: 'mine',
    orders: [],
    loading: true
  },

  onShow() {
    this.loadOrders();
  },

  switchScope(event) {
    this.setData({ scope: event.currentTarget.dataset.scope }, () => this.loadOrders());
  },

  async loadOrders() {
    this.setData({ loading: true });
    const result = await api.getOrderHistory({ scope: this.data.scope });
    this.setData({ orders: result.orders, loading: false });
  }
});
```

Create `miniprogram/pages/history/index.wxml`:

```xml
<view class="page history-page">
  <view class="tabs">
    <view class="tab {{scope === 'mine' ? 'active' : ''}}" data-scope="mine" bindtap="switchScope">我的记录</view>
    <view class="tab {{scope === 'family' ? 'active' : ''}}" data-scope="family" bindtap="switchScope">全家记录</view>
  </view>
  <view wx:if="{{loading}}" class="loading">加载中...</view>
  <view wx:for="{{orders}}" wx:key="_id" class="order-card">
    <view class="order-head">{{item.submitterName}} · {{item.createdAt}}</view>
    <view wx:for="{{item.items}}" wx:for-item="dish" wx:key="dishId" class="dish-line">
      {{dish.dishName}} x{{dish.quantity}} {{dish.itemNote}}
    </view>
    <view wx:if="{{item.orderNote}}" class="order-note">备注：{{item.orderNote}}</view>
  </view>
</view>
```

Create `miniprogram/pages/history/index.wxss`:

```css
.history-page {
  padding: 24rpx;
}

.tabs {
  display: flex;
  margin-bottom: 24rpx;
  background: #e2e8f0;
  border-radius: 16rpx;
  overflow: hidden;
}

.tab {
  flex: 1;
  padding: 20rpx;
  text-align: center;
}

.tab.active {
  color: #ffffff;
  background: #0f766e;
  font-weight: 700;
}

.order-card {
  margin-bottom: 20rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #ffffff;
}

.order-head {
  font-weight: 700;
  margin-bottom: 16rpx;
}

.dish-line,
.order-note,
.loading {
  color: #475569;
  line-height: 1.7;
}
```

- [ ] **Step 6: Manual verify submit and history**

In WeChat Developer Tools:

- Add one member document for the current `openid`.
- Add one category and two dishes.
- Select dishes, edit notes, submit.
- Expected: `orders` collection receives one document with item snapshots.
- Open history.
- Expected: My Records and Family Records both show the saved order.

- [ ] **Step 7: Commit**

```powershell
git add cloudfunctions/submitOrder cloudfunctions/getOrderHistory miniprogram/pages/confirm miniprogram/pages/history
git commit -m "feat: add order submission and history"
```

---

### Task 5: Admin Authentication And Shared Helpers

**Files:**
- Create: `cloudfunctions/shared/adminAuth.js`
- Create: `tests/admin-auth.test.mjs`
- Create: `cloudfunctions/adminLogin/index.js`
- Create: `cloudfunctions/adminLogin/package.json`

- [ ] **Step 1: Create admin auth helper**

Create `cloudfunctions/shared/adminAuth.js`:

```js
const crypto = require('node:crypto');

function hashPassword(password, salt) {
  return crypto
    .createHash('sha256')
    .update(`${salt}:${password}`)
    .digest('hex');
}

function verifyPassword(password, passwordHash, salt) {
  return hashPassword(password, salt) === passwordHash;
}

function createSession(openid, now = Date.now()) {
  const expiresAt = now + 12 * 60 * 60 * 1000;
  const token = crypto
    .createHash('sha256')
    .update(`${openid}:${expiresAt}:${crypto.randomBytes(16).toString('hex')}`)
    .digest('hex');
  return { token, expiresAt };
}

function isSessionValid(session, now = Date.now()) {
  return Boolean(session && session.token && session.expiresAt > now);
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  isSessionValid
};
```

- [ ] **Step 2: Create admin auth tests**

Create `tests/admin-auth.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import auth from '../cloudfunctions/shared/adminAuth.js';

test('verifyPassword accepts matching password and salt', () => {
  const hash = auth.hashPassword('secret', 'salt-1');
  assert.equal(auth.verifyPassword('secret', hash, 'salt-1'), true);
  assert.equal(auth.verifyPassword('wrong', hash, 'salt-1'), false);
});

test('isSessionValid rejects expired sessions', () => {
  const session = auth.createSession('admin-openid', 1000);
  assert.equal(auth.isSessionValid(session, 1001), true);
  assert.equal(auth.isSessionValid(session, session.expiresAt + 1), false);
});
```

- [ ] **Step 3: Run tests**

Run:

```powershell
npm test
```

Expected:

```text
# pass 6
```

- [ ] **Step 4: Create admin login function**

Create `cloudfunctions/adminLogin/package.json`:

```json
{
  "name": "adminLogin",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

Create `cloudfunctions/adminLogin/index.js`:

```js
const cloud = require('wx-server-sdk');
const { verifyPassword, createSession } = require('../shared/adminAuth');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const password = String(event.password || '');
  const configResult = await db.collection('admin_config').limit(1).get();
  const config = configResult.data[0];

  if (!config || !verifyPassword(password, config.adminPasswordHash, config.adminPasswordSalt)) {
    throw new Error('INVALID_ADMIN_PASSWORD');
  }

  const session = createSession(OPENID);
  await db.collection('admin_sessions').add({
    data: {
      token: session.token,
      openid: OPENID,
      expiresAt: session.expiresAt,
      createdAt: new Date().toISOString()
    }
  });

  return { ok: true, token: session.token, expiresAt: session.expiresAt };
};
```

- [ ] **Step 5: Commit**

```powershell
git add cloudfunctions/shared/adminAuth.js tests/admin-auth.test.mjs cloudfunctions/adminLogin
git commit -m "feat: add admin authentication"
```

---

### Task 6: Admin Web App Shell

**Files:**
- Create: `admin/package.json`
- Create: `admin/index.html`
- Create: `admin/tsconfig.json`
- Create: `admin/vite.config.ts`
- Create: `admin/src/main.tsx`
- Create: `admin/src/App.tsx`
- Create: `admin/src/api/cloud.ts`
- Create: `admin/src/styles.css`

- [ ] **Step 1: Create admin package**

Create `admin/package.json`:

```json
{
  "name": "family-ordering-admin",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc && vite build",
    "preview": "vite preview --host 127.0.0.1"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "typescript": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {}
}
```

- [ ] **Step 2: Create admin config files**

Create `admin/index.html`:

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

Create `admin/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

Create `admin/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()]
});
```

- [ ] **Step 3: Create cloud API placeholder**

Create `admin/src/api/cloud.ts`:

```ts
type CloudResponse<T> = Promise<T>;

export type AdminSession = {
  token: string;
  expiresAt: number;
};

export async function adminLogin(password: string): CloudResponse<AdminSession> {
  const wx = (window as unknown as { wx?: { cloud?: { callFunction: Function } } }).wx;
  if (!wx?.cloud) {
    throw new Error('请在支持微信云开发的环境中打开后台');
  }
  const response = await wx.cloud.callFunction({
    name: 'adminLogin',
    data: { password }
  });
  return response.result as AdminSession;
}
```

- [ ] **Step 4: Create admin React shell**

Create `admin/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `admin/src/App.tsx`:

```tsx
import { useState } from 'react';
import { adminLogin } from './api/cloud';

const navItems = ['仪表盘', '分类管理', '菜品管理', '订单记录', '家庭成员'];

export default function App() {
  const [password, setPassword] = useState('');
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('adminToken') || '');
  const [active, setActive] = useState(navItems[0]);
  const [error, setError] = useState('');

  async function login() {
    try {
      const session = await adminLogin(password);
      localStorage.setItem('adminToken', session.token);
      setSessionToken(session.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登录失败');
    }
  }

  if (!sessionToken) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <h1>家庭点菜后台</h1>
          <input value={password} type="password" placeholder="管理员密码" onChange={(event) => setPassword(event.target.value)} />
          <button onClick={login}>登录</button>
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-layout">
      <aside>
        <h1>家庭点菜</h1>
        {navItems.map((item) => (
          <button className={item === active ? 'active' : ''} key={item} onClick={() => setActive(item)}>{item}</button>
        ))}
      </aside>
      <section className="workspace">
        <h2>{active}</h2>
        <p>当前模块将在后续任务接入真实数据。</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Create admin styles**

Create `admin/src/styles.css`:

```css
body {
  margin: 0;
  color: #172026;
  background: #f7f8fa;
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
}

button,
input {
  font: inherit;
}

.login-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
}

.login-panel {
  width: 360px;
  padding: 32px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.login-panel input,
.login-panel button {
  box-sizing: border-box;
  width: 100%;
  margin-top: 16px;
  padding: 12px;
}

.login-panel button,
aside button.active {
  color: #fff;
  background: #0f766e;
  border: 0;
}

.error {
  color: #b91c1c;
}

.admin-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}

aside {
  padding: 24px;
  background: #fff;
  border-right: 1px solid #e2e8f0;
}

aside button {
  display: block;
  width: 100%;
  margin-bottom: 8px;
  padding: 12px;
  text-align: left;
  border: 0;
  border-radius: 6px;
  background: transparent;
}

.workspace {
  padding: 32px;
}
```

- [ ] **Step 6: Install and build admin app**

Run:

```powershell
cd admin
npm install
npm run build
cd ..
```

Expected:

```text
✓ built
```

- [ ] **Step 7: Commit**

```powershell
git add admin
git commit -m "feat: add admin web shell"
```

---

### Task 7: Admin Data Management

**Files:**
- Create: `cloudfunctions/adminApi/index.js`
- Create: `cloudfunctions/adminApi/package.json`
- Modify: `admin/src/api/cloud.ts`
- Create: `admin/src/pages/CategoriesPage.tsx`
- Create: `admin/src/pages/DishesPage.tsx`
- Create: `admin/src/pages/OrdersPage.tsx`
- Create: `admin/src/pages/MembersPage.tsx`
- Modify: `admin/src/App.tsx`

- [ ] **Step 1: Create admin API cloud function**

Create `cloudfunctions/adminApi/package.json`:

```json
{
  "name": "adminApi",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

Create `cloudfunctions/adminApi/index.js`:

```js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function assertAdmin(token) {
  const now = Date.now();
  const result = await db.collection('admin_sessions')
    .where({ token })
    .limit(1)
    .get();
  const session = result.data[0];
  if (!session || session.expiresAt <= now) {
    throw new Error('ADMIN_SESSION_EXPIRED');
  }
  return session;
}

async function log(action, targetType, targetId, summary) {
  await db.collection('audit_logs').add({
    data: {
      actor: 'admin',
      action,
      targetType,
      targetId,
      summary,
      createdAt: new Date().toISOString()
    }
  });
}

exports.main = async (event) => {
  await assertAdmin(event.token);
  const action = event.action;
  const payload = event.payload || {};

  if (action === 'listCategories') {
    const result = await db.collection('categories').orderBy('sortOrder', 'asc').get();
    return { ok: true, categories: result.data };
  }

  if (action === 'saveCategory') {
    const data = {
      name: String(payload.name || '').trim(),
      sortOrder: Number(payload.sortOrder || 0),
      enabled: payload.enabled !== false,
      updatedAt: new Date().toISOString()
    };
    if (!data.name) throw new Error('CATEGORY_NAME_REQUIRED');
    if (payload._id) {
      await db.collection('categories').doc(payload._id).update({ data });
      await log('update', 'category', payload._id, data.name);
      return { ok: true, _id: payload._id };
    }
    const result = await db.collection('categories').add({
      data: { ...data, createdAt: new Date().toISOString() }
    });
    await log('create', 'category', result._id, data.name);
    return { ok: true, _id: result._id };
  }

  if (action === 'listDishes') {
    const result = await db.collection('dishes').orderBy('sortOrder', 'asc').get();
    return { ok: true, dishes: result.data };
  }

  if (action === 'saveDish') {
    const data = {
      name: String(payload.name || '').trim(),
      categoryId: String(payload.categoryId || ''),
      imageFileId: String(payload.imageFileId || ''),
      price: payload.price === '' ? null : Number(payload.price),
      description: String(payload.description || '').trim(),
      sortOrder: Number(payload.sortOrder || 0),
      isOnShelf: payload.isOnShelf !== false,
      updatedAt: new Date().toISOString()
    };
    if (!data.name) throw new Error('DISH_NAME_REQUIRED');
    if (!data.categoryId) throw new Error('DISH_CATEGORY_REQUIRED');
    if (!data.imageFileId) throw new Error('DISH_IMAGE_REQUIRED');
    if (payload._id) {
      await db.collection('dishes').doc(payload._id).update({ data });
      await log('update', 'dish', payload._id, data.name);
      return { ok: true, _id: payload._id };
    }
    const result = await db.collection('dishes').add({
      data: { ...data, createdAt: new Date().toISOString() }
    });
    await log('create', 'dish', result._id, data.name);
    return { ok: true, _id: result._id };
  }

  if (action === 'listMembers') {
    const result = await db.collection('members').orderBy('createdAt', 'desc').get();
    return { ok: true, members: result.data };
  }

  if (action === 'saveMember') {
    const data = {
      openid: String(payload.openid || '').trim(),
      displayName: String(payload.displayName || '').trim(),
      enabled: payload.enabled !== false,
      updatedAt: new Date().toISOString()
    };
    if (!data.openid) throw new Error('MEMBER_OPENID_REQUIRED');
    if (!data.displayName) throw new Error('MEMBER_NAME_REQUIRED');
    if (payload._id) {
      await db.collection('members').doc(payload._id).update({ data });
      await log('update', 'member', payload._id, data.displayName);
      return { ok: true, _id: payload._id };
    }
    const result = await db.collection('members').add({
      data: { ...data, createdAt: new Date().toISOString() }
    });
    await log('create', 'member', result._id, data.displayName);
    return { ok: true, _id: result._id };
  }

  if (action === 'listOrders') {
    const result = await db.collection('orders').orderBy('createdAt', 'desc').limit(100).get();
    return { ok: true, orders: result.data };
  }

  throw new Error('UNKNOWN_ADMIN_ACTION');
};
```

- [ ] **Step 2: Extend admin cloud wrapper**

Replace `admin/src/api/cloud.ts` with:

```ts
type CloudFunctionResponse<T> = { result: T };

export type AdminSession = {
  token: string;
  expiresAt: number;
};

function getWxCloud() {
  const wx = (window as unknown as { wx?: { cloud?: { callFunction: Function } } }).wx;
  if (!wx?.cloud) {
    throw new Error('请在支持微信云开发的环境中打开后台');
  }
  return wx.cloud;
}

export async function adminLogin(password: string): Promise<AdminSession> {
  const response = await getWxCloud().callFunction({
    name: 'adminLogin',
    data: { password }
  }) as CloudFunctionResponse<AdminSession>;
  return response.result;
}

export async function adminApi<T>(token: string, action: string, payload = {}): Promise<T> {
  const response = await getWxCloud().callFunction({
    name: 'adminApi',
    data: { token, action, payload }
  }) as CloudFunctionResponse<T>;
  return response.result;
}
```

- [ ] **Step 3: Create simple admin pages**

Create `admin/src/pages/CategoriesPage.tsx`:

```tsx
export default function CategoriesPage() {
  return <p>分类管理：新增、改名、排序、启用和停用分类。</p>;
}
```

Create `admin/src/pages/DishesPage.tsx`:

```tsx
export default function DishesPage() {
  return <p>菜品管理：新增菜品、上传图片、填写可选价格、上下架。</p>;
}
```

Create `admin/src/pages/OrdersPage.tsx`:

```tsx
export default function OrdersPage() {
  return <p>订单记录：查看点菜人、菜品数量、备注和推送状态。</p>;
}
```

Create `admin/src/pages/MembersPage.tsx`:

```tsx
export default function MembersPage() {
  return <p>家庭成员：维护允许使用小程序的微信 openid 白名单。</p>;
}
```

- [ ] **Step 4: Wire pages into `App.tsx`**

Import the pages and render them based on `active`. Replace the workspace paragraph with:

```tsx
{active === '仪表盘' && <p>今天点菜次数、最近点菜记录和常点菜品将在这里展示。</p>}
{active === '分类管理' && <CategoriesPage />}
{active === '菜品管理' && <DishesPage />}
{active === '订单记录' && <OrdersPage />}
{active === '家庭成员' && <MembersPage />}
```

Add imports:

```tsx
import CategoriesPage from './pages/CategoriesPage';
import DishesPage from './pages/DishesPage';
import OrdersPage from './pages/OrdersPage';
import MembersPage from './pages/MembersPage';
```

- [ ] **Step 5: Build admin app**

Run:

```powershell
cd admin
npm run build
cd ..
```

Expected:

```text
✓ built
```

- [ ] **Step 6: Commit**

```powershell
git add cloudfunctions/adminApi admin/src
git commit -m "feat: add admin management API"
```

---

### Task 8: Push Provider Integration

**Files:**
- Create: `cloudfunctions/shared/push.js`
- Modify: `cloudfunctions/submitOrder/index.js`
- Modify: `cloudfunctions/adminApi/index.js`

- [ ] **Step 1: Create push helper**

Create `cloudfunctions/shared/push.js`:

```js
const https = require('node:https');
const { formatPushMessage } = require('./domain');

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve({ statusCode: response.statusCode, data }));
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

async function sendServerChan(sendKey, order) {
  const url = `https://sctapi.ftqq.com/${sendKey}.send`;
  const message = formatPushMessage(order);
  return postJson(url, {
    title: `家里点菜：${order.submitterName}`,
    desp: message
  });
}

async function sendOrderPush(config, order) {
  if (!config || !config.pushProvider || !config.pushConfig) {
    return { status: 'skipped', error: 'PUSH_NOT_CONFIGURED' };
  }
  if (config.pushProvider === 'server_chan') {
    const result = await sendServerChan(config.pushConfig.sendKey, order);
    if (result.statusCode >= 200 && result.statusCode < 300) {
      return { status: 'sent', error: '' };
    }
    return { status: 'failed', error: result.data };
  }
  return { status: 'failed', error: 'UNSUPPORTED_PUSH_PROVIDER' };
}

module.exports = {
  sendOrderPush
};
```

- [ ] **Step 2: Replace placeholder push in `submitOrder`**

In `cloudfunctions/submitOrder/index.js`, import:

```js
const { sendOrderPush } = require('../shared/push');
```

Replace the local `sendPush` function with:

```js
async function sendPush(order) {
  const configResult = await db.collection('admin_config').limit(1).get();
  return sendOrderPush(configResult.data[0], order);
}
```

- [ ] **Step 3: Add retry action to admin API**

In `cloudfunctions/adminApi/index.js`, import:

```js
const { sendOrderPush } = require('../shared/push');
```

Add an action before the unknown action error:

```js
if (action === 'retryOrderPush') {
  const orderResult = await db.collection('orders').doc(payload.orderId).get();
  const configResult = await db.collection('admin_config').limit(1).get();
  const pushResult = await sendOrderPush(configResult.data[0], orderResult.data);
  await db.collection('orders').doc(payload.orderId).update({
    data: {
      pushStatus: pushResult.status,
      pushError: pushResult.error || ''
    }
  });
  await log('retryPush', 'order', payload.orderId, pushResult.status);
  return { ok: true, pushStatus: pushResult.status };
}
```

- [ ] **Step 4: Manual verify push**

In cloud database, create one `admin_config` document:

```json
{
  "pushProvider": "server_chan",
  "pushConfig": {
    "sendKey": "your-real-send-key"
  }
}
```

Submit an order in the mini program. Expected:

- `orders.pushStatus` becomes `sent` when Server Chan succeeds.
- Your WeChat receives the message.
- If the key is wrong, `orders.pushStatus` becomes `failed`.

- [ ] **Step 5: Commit**

```powershell
git add cloudfunctions/shared/push.js cloudfunctions/submitOrder/index.js cloudfunctions/adminApi/index.js
git commit -m "feat: add order push integration"
```

---

### Task 9: Deployment Notes And End-To-End Verification

**Files:**
- Modify: `README.md`
- Create: `docs/deployment.md`

- [ ] **Step 1: Create deployment guide**

Create `docs/deployment.md`:

```markdown
# 部署说明

## 微信云开发

1. 使用微信开发者工具打开项目根目录。
2. 修改 `project.config.json` 中的 `appid` 为真实小程序 AppID。
3. 开通云开发环境。
4. 上传并部署以下云函数：
   - `checkMemberAccess`
   - `getMenu`
   - `submitOrder`
   - `getOrderHistory`
   - `adminLogin`
   - `adminApi`

## 数据集合

创建集合：

- `members`
- `categories`
- `dishes`
- `orders`
- `admin_config`
- `admin_sessions`
- `audit_logs`

## 第一位家庭成员

先打开小程序获取无权限提示，再从云函数日志或临时调试输出确认自己的 `openid`，手动插入 `members` 集合。

## 推送配置

在 `admin_config` 中保存：

```json
{
  "pushProvider": "server_chan",
  "pushConfig": {
    "sendKey": "your-real-send-key"
  }
}
```

## 验收

1. 白名单成员能进入菜单。
2. 非白名单成员不能进入菜单。
3. 后台能新增分类和菜品。
4. 小程序能看到上架菜品。
5. 能提交含数量、单菜备注、整单备注的订单。
6. 能收到微信推送。
7. 历史记录能切换“我的记录”和“全家记录”。
```

- [ ] **Step 2: Link deployment guide in README**

Append to `README.md`:

```markdown
## 部署

详见 [docs/deployment.md](docs/deployment.md)。
```

- [ ] **Step 3: Final local checks**

Run:

```powershell
npm test
cd admin
npm run build
cd ..
git status --short
```

Expected:

```text
# pass 6
✓ built
```

`git status --short` should show only intended documentation changes before committing.

- [ ] **Step 4: Commit**

```powershell
git add README.md docs/deployment.md
git commit -m "docs: add deployment guide"
```

- [ ] **Step 5: Push**

Run:

```powershell
git push
```

Expected:

```text
main -> main
```

---

## Self-Review

- Spec coverage: The plan covers member whitelist, efficient mini program menu layout, quantity selection, per-dish notes, whole-order notes, history scopes, web admin login, category/dish/member/order management, cloud database/storage boundaries, push integration, retry behavior, and deployment notes.
- Scope: Payment, delivery, order status flow, coupons, public registration, multi-admin permissions, and native mini program subscription messages remain out of scope, matching the design spec.
- Placeholder scan: The implementation steps avoid unfinished placeholder markers and undefined task references. The only provider-specific choice is Server Chan as the first concrete implementation of the agreed external push abstraction.
- Type consistency: Shared order item fields use `dishId`, `dishName`, `imageFileId`, `price`, `quantity`, `itemNote`, and `categoryId` consistently across domain helpers, submit order, mini program pages, and history.
