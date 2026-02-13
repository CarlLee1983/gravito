# API Reference

## Base URL

```
http://localhost:3070
```

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Permission denied
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Authentication

Authentication uses session-based cookies:

```bash
# Login
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

# Response includes Set-Cookie header
# Subsequent requests include session cookie automatically
```

---

## Cart API

### Get Cart

Retrieve the current user's shopping cart.

```http
GET /cart
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 5,
    "itemCount": 2,
    "subtotal": 44000,
    "createdAt": "2026-02-12T10:00:00Z",
    "updatedAt": "2026-02-12T11:30:00Z",
    "items": [
      {
        "id": 1,
        "productId": 1,
        "quantity": 1,
        "price": 35000,
        "lineTotal": 35000,
        "product": {
          "id": 1,
          "name": "iPhone 15",
          "slug": "iphone-15",
          "imageUrl": "https://example.com/iphone-15.jpg",
          "stock": 50
        },
        "createdAt": "2026-02-12T10:00:00Z"
      }
    ]
  }
}
```

### Add Item to Cart

Add a product to the shopping cart.

```http
POST /cart/add
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 2
}
```

**Parameters**:
- `product_id` (number, required) - Product ID
- `quantity` (number, optional, default: 1) - Quantity to add

**Response** (200):
```json
{
  "success": true,
  "message": "商品已加入購物車",
  "cart": {
    "item_count": 3,
    "subtotal": 79000
  }
}
```

**Errors**:
- `400` - Product not found or unavailable
- `400` - Insufficient stock

### Update Cart Item

Update quantity of an item in cart.

```http
PUT /cart/items/:itemId
Content-Type: application/json

{
  "quantity": 3
}
```

**Parameters**:
- `itemId` (number, in URL) - Cart item ID
- `quantity` (number, in body) - New quantity

**Response** (200):
```json
{
  "success": true,
  "cart": {
    "item_count": 4,
    "subtotal": 109000
  }
}
```

**Errors**:
- `400` - Insufficient stock
- `404` - Cart item not found

### Remove Cart Item

Remove an item from the cart.

```http
DELETE /cart/items/:itemId
```

**Parameters**:
- `itemId` (number, in URL) - Cart item ID

**Response** (200):
```json
{
  "success": true,
  "cart": {
    "item_count": 2,
    "subtotal": 44000
  }
}
```

### Clear Cart

Remove all items from the cart.

```http
DELETE /cart/clear
```

**Response** (200):
```json
{
  "success": true,
  "cart": {
    "item_count": 0,
    "subtotal": 0
  }
}
```

### Get Cart Summary

Quick summary for header mini-cart display.

```http
GET /cart/summary
```

**Response** (200):
```json
{
  "item_count": 2,
  "subtotal": 44000,
  "items": [
    {
      "id": 1,
      "quantity": 1,
      "price": 35000,
      "product": {
        "id": 1,
        "name": "iPhone 15",
        "slug": "iphone-15",
        "imageUrl": "https://example.com/iphone-15.jpg",
        "stock": 50
      }
    }
  ]
}
```

---

## Order API

### Create Order

Convert shopping cart to an order.

```http
POST /orders
Content-Type: application/json

{
  "cartId": 1,
  "shippingAddress": {
    "name": "John Doe",
    "phone": "0912345678",
    "address": "123 Main Street",
    "city": "Taipei",
    "postal_code": "100"
  }
}
```

**Parameters**:
- `cartId` (number) - Cart ID
- `shippingAddress` (object) - Shipping address
  - `name` (string) - Recipient name
  - `phone` (string) - Phone number
  - `address` (string) - Street address
  - `city` (string) - City
  - `postal_code` (string) - Postal code

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD-20260212-ABC123",
    "status": "pending",
    "statusLabel": "待付款",
    "userId": 5,
    "subtotal": 44000,
    "tax": 0,
    "shipping": 6000,
    "total": 50000,
    "formattedTotal": "NT$ 50,000",
    "shippingAddress": {
      "name": "John Doe",
      "phone": "0912345678",
      "address": "123 Main Street",
      "city": "Taipei",
      "postal_code": "100"
    },
    "notes": null,
    "canBeCancelled": true,
    "createdAt": "2026-02-12T12:00:00Z",
    "updatedAt": "2026-02-12T12:00:00Z",
    "items": [
      {
        "id": 1,
        "orderId": 1,
        "productId": 1,
        "productName": "iPhone 15",
        "quantity": 1,
        "price": 35000,
        "lineTotal": 35000
      }
    ]
  }
}
```

**Errors**:
- `400` - Cart is empty
- `400` - Insufficient stock
- `404` - Cart not found

### Get Order

Retrieve order details.

```http
GET /orders/:orderId
```

**Parameters**:
- `orderId` (number, in URL) - Order ID

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD-20260212-ABC123",
    "status": "pending",
    "statusLabel": "待付款",
    "items": [ /* order items */ ],
    "formattedTotal": "NT$ 50,000"
  }
}
```

**Errors**:
- `404` - Order not found

### Get Order by Number

Retrieve order by order number.

```http
GET /orders/number/:orderNumber
```

**Parameters**:
- `orderNumber` (string, in URL) - Order number (e.g., ORD-20260212-ABC123)

**Response** (200):
```json
{
  "success": true,
  "data": { /* order */ }
}
```

### Get User Orders

Get paginated list of user's orders.

```http
GET /orders?page=1&perPage=10
```

**Query Parameters**:
- `page` (number, default: 1) - Page number
- `perPage` (number, default: 10) - Items per page

**Response** (200):
```json
{
  "success": true,
  "data": {
    "orders": [ /* array of orders */ ],
    "total": 25,
    "totalPages": 3
  }
}
```

### Update Order Status

Update order status (admin only).

```http
PATCH /orders/:orderId/status
Content-Type: application/json

{
  "status": "paid"
}
```

**Parameters**:
- `orderId` (number, in URL) - Order ID
- `status` (string) - New status: `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`

**Response** (200):
```json
{
  "success": true
}
```

### Mark Order as Paid

Record payment for an order.

```http
POST /orders/:orderId/pay
Content-Type: application/json

{
  "paymentIntentId": "pi_test_123"
}
```

**Parameters**:
- `orderId` (number, in URL) - Order ID
- `paymentIntentId` (string) - Payment processor ID (e.g., Stripe)

**Response** (200):
```json
{
  "success": true
}
```

### Cancel Order

Cancel an order and restore stock.

```http
POST /orders/:orderId/cancel
```

**Conditions**:
- Order must be in `pending` or `paid` status
- Cannot cancel `shipped`, `delivered`, `cancelled`, `refunded` orders

**Response** (200):
```json
{
  "success": true,
  "message": "訂單已取消，庫存已恢復"
}
```

**Errors**:
- `400` - Order cannot be cancelled
- `404` - Order not found

---

## Product API

### List Products

Get all products (with pagination).

```http
GET /products?page=1&search=iPhone
```

**Query Parameters**:
- `page` (number, default: 1) - Page number
- `search` (string, optional) - Search by name or slug
- `category` (string, optional) - Filter by category ID

**Response** (200):
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "iPhone 15",
        "slug": "iphone-15",
        "price": 35000,
        "stock": 50,
        "image_url": "https://example.com/iphone-15.jpg"
      }
    ],
    "total": 50,
    "page": 1
  }
}
```

### Get Product

Retrieve single product details.

```http
GET /products/:productId
```

**Parameters**:
- `productId` (number, in URL) - Product ID

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "iPhone 15",
    "slug": "iphone-15",
    "description": "Latest iPhone model",
    "price": 35000,
    "stock": 50,
    "image_url": "https://example.com/iphone-15.jpg",
    "category_id": 1,
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

**Errors**:
- `404` - Product not found

### Search Products

Full-text search across products.

```http
GET /products/search?q=iphone&sort=popularity
```

**Query Parameters**:
- `q` (string, required) - Search query
- `sort` (string, default: relevance) - Sort by: `relevance`, `price_asc`, `price_desc`, `newest`, `popular`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "results": [ /* matching products */ ],
    "total": 10
  }
}
```

---

## User API

### Get Current User

Get authenticated user information.

```http
GET /user
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "customer",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

**Errors**:
- `401` - Not authenticated

### Update User Profile

Update user information.

```http
PUT /user/profile
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Parameters**:
- `name` (string) - User name
- `email` (string) - User email

**Response** (200):
```json
{
  "success": true,
  "data": { /* updated user */ }
}
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `CART_NOT_FOUND` | 404 | Shopping cart not found |
| `PRODUCT_NOT_FOUND` | 404 | Product not found |
| `PRODUCT_UNAVAILABLE` | 400 | Product is no longer available |
| `INSUFFICIENT_STOCK` | 400 | Not enough stock for requested quantity |
| `CART_ITEM_NOT_FOUND` | 404 | Item not in cart |
| `EMPTY_CART` | 400 | Cannot create order from empty cart |
| `ORDER_NOT_FOUND` | 404 | Order not found |
| `ORDER_NOT_CANCELLABLE` | 400 | Order cannot be cancelled in current status |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

Currently no rate limiting is implemented. Production deployment should include:

```
Rate Limit: 1000 requests per minute per IP
Headers:
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 999
  X-RateLimit-Reset: 1707808800
```

---

## Pagination

Paginated endpoints use standard cursor-based pagination:

**Query**:
```http
GET /orders?page=2&perPage=20
```

**Response**:
```json
{
  "success": true,
  "data": {
    "items": [ /* 20 items */ ],
    "total": 150,
    "page": 2,
    "perPage": 20,
    "totalPages": 8,
    "hasMore": true
  }
}
```

---

## Changelog

### v1.2.0
- Added request-level product caching (Phase 4)
- Implemented batch product loading (Phase 3)
- Added ORM-based relationships (Phase 2)
- Eliminated redundant queries (Phase 1)
- Comprehensive test coverage (81 tests)

### v1.1.0
- Initial cart and order APIs
- Product listing and search
- Basic authentication

---

**Version**: 1.2.0
**Last Updated**: 2026-02-12
**Authentication**: Session-based (cookies)
