import express from 'express';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  Restaurant,
  UserProfile,
  Product,
  SupplyRequest,
  RequestItem,
  StockAuditLog,
  Supplier,
} from './src/types';
import {
  INITIAL_RESTAURANTS,
  INITIAL_USERS,
  INITIAL_SUPPLIERS,
  INITIAL_PRODUCTS_CADDY_SHACK,
} from './src/data/caddyShackData';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// CORS — allow all origins for demo
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

// --- JSON File Persistence ---
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not load store.json, starting fresh:', e);
  }
  return null;
}

function saveData() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ restaurants, users, suppliers, products, supplyRequests, auditLogs, requestCounter }, null, 2),
      'utf-8'
    );
  } catch (e) {
    console.error('Could not save store.json:', e);
  }
}

// --- In-Memory State & Store ---
let restaurants: Restaurant[];
let users: UserProfile[];
let suppliers: Supplier[];
let products: Product[];
let supplyRequests: SupplyRequest[];
let auditLogs: StockAuditLog[];
let requestCounter: number;

const saved = loadData();

if (saved) {
  restaurants = saved.restaurants;
  users = saved.users;
  suppliers = saved.suppliers;
  products = saved.products;
  supplyRequests = saved.supplyRequests;
  auditLogs = saved.auditLogs || [];
  requestCounter = saved.requestCounter || 124;
} else {
  // Seed from initial data
  restaurants = [...INITIAL_RESTAURANTS];
  users = [...INITIAL_USERS];
  suppliers = [...INITIAL_SUPPLIERS];

  products = INITIAL_PRODUCTS_CADDY_SHACK.map((p, index) => ({
    ...p,
    id: `prod-${index + 1}`,
    updatedAt: new Date().toISOString(),
  }));

  requestCounter = 124;
  supplyRequests = [
    {
      id: 'req-101',
      requestNumber: 124,
      restaurantId: 'rest-1',
      restaurantName: 'Caddy Shack Grill',
      createdByUserId: 'user-1',
      createdByUserName: 'Yaciel',
      assignedBuyerId: 'user-2',
      assignedBuyerName: 'Pete',
      status: 'En Compra',
      urgent: true,
      notes: 'Requerimos tocino y pan urgente antes de las 11:00 AM para el turno del almuerzo.',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      assignedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      shoppingStartedAt: new Date(Date.now() - 3600000 * 0.5).toISOString(),
      items: [
        {
          id: 'ri-1',
          productId: 'prod-2',
          productName: 'Bacon',
          category: 'INGREDIENTS',
          unit: 'Caja',
          currentStockAtRequest: 0,
          minThreshold: 2,
          requestedQty: 4,
          suggestedSupplier: 'Restaurant Depot',
          purchased: true,
          purchasedAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'ri-2',
          productId: 'prod-3',
          productName: 'Burger Buns',
          category: 'INGREDIENTS',
          unit: 'Paquete',
          currentStockAtRequest: 1,
          minThreshold: 3,
          requestedQty: 8,
          suggestedSupplier: 'Panadería Local El Sol',
          purchased: true,
          purchasedAt: new Date(Date.now() - 1200000).toISOString(),
        },
        {
          id: 'ri-3',
          productId: 'prod-1',
          productName: 'American Cheese (squares)',
          category: 'INGREDIENTS',
          unit: 'Paquete',
          currentStockAtRequest: 1,
          minThreshold: 2,
          requestedQty: 5,
          suggestedSupplier: "Sam's Club",
          purchased: false,
        },
        {
          id: 'ri-4',
          productId: 'prod-15',
          productName: 'Fries (Papas Fritas)',
          category: 'INGREDIENTS',
          unit: 'Caja',
          currentStockAtRequest: 1,
          minThreshold: 3,
          requestedQty: 6,
          suggestedSupplier: "Sam's Club",
          purchased: false,
        },
      ],
    },
  ];

  auditLogs = [];
  saveData();
}

// --- Server-Sent Events (SSE) for Real-Time Sync ---
let sseClients: express.Response[] = [];

function broadcastUpdate(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch (_) {
      sseClients = sseClients.filter((c) => c !== client);
    }
  });
}

// SSE heartbeat — keeps mobile connections alive
setInterval(() => {
  sseClients = sseClients.filter((client) => {
    try {
      client.write(': heartbeat\n\n');
      return true;
    } catch (_) {
      return false;
    }
  });
}, 30000);

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter((client) => client !== res);
  });
});

// --- REST API ENDPOINTS ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Restaurants
app.get('/api/restaurants', (req, res) => {
  res.json(restaurants);
});

app.post('/api/restaurants', (req, res) => {
  const { name, type, address, phone, colorBadge } = req.body;
  const newRest: Restaurant = {
    id: randomUUID(),
    name,
    type: type || 'Restaurante',
    address: address || 'Big Spring, TX',
    phone: phone || '',
    active: true,
    colorBadge: colorBadge || 'bg-blue-600',
  };
  restaurants.push(newRest);
  saveData();
  broadcastUpdate('RESTAURANT_CREATED', newRest);
  res.status(201).json(newRest);
});

// Users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Products
app.get('/api/products', (req, res) => {
  const { restaurantId } = req.query;
  if (restaurantId) {
    return res.json(products.filter((p) => p.restaurantId === restaurantId));
  }
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const newProduct: Product = {
    ...req.body,
    id: randomUUID(),
    updatedAt: new Date().toISOString(),
  };
  products.push(newProduct);
  saveData();
  broadcastUpdate('PRODUCT_ADDED', newProduct);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  products[index] = {
    ...products[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  saveData();
  broadcastUpdate('PRODUCT_UPDATED', products[index]);
  res.json(products[index]);
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  products = products.filter((p) => p.id !== id);
  saveData();
  broadcastUpdate('PRODUCT_DELETED', { id });
  res.json({ success: true });
});

// Supply Requests
app.get('/api/requests', (req, res) => {
  const { restaurantId, status } = req.query;
  let filtered = [...supplyRequests];
  if (restaurantId) {
    filtered = filtered.filter((r) => r.restaurantId === restaurantId);
  }
  if (status) {
    filtered = filtered.filter((r) => r.status === status);
  }
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(filtered);
});

app.post('/api/requests', (req, res) => {
  const { restaurantId, createdByUserId, items, notes, urgent } = req.body;
  const rest = restaurants.find((r) => r.id === restaurantId);
  const user = users.find((u) => u.id === createdByUserId);

  requestCounter += 1;
  const newReq: SupplyRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    requestNumber: requestCounter,
    restaurantId: restaurantId || 'rest-1',
    restaurantName: rest ? rest.name : 'Caddy Shack Grill',
    createdByUserId: createdByUserId || 'user-1',
    createdByUserName: user ? user.name : 'Yaciel',
    status: 'Pendiente',
    urgent: !!urgent,
    notes: notes || '',
    createdAt: new Date().toISOString(),
    items: (items || []).map((it: any, i: number) => ({
      id: `ri-${Date.now()}-${i}`,
      productId: it.productId,
      productName: it.productName,
      category: it.category,
      unit: it.unit,
      currentStockAtRequest: it.currentStockAtRequest,
      minThreshold: it.minThreshold,
      requestedQty: it.requestedQty,
      suggestedSupplier: it.suggestedSupplier,
      purchased: false,
    })),
  };

  supplyRequests.unshift(newReq);
  saveData();
  broadcastUpdate('REQUEST_CREATED', newReq);
  res.status(201).json(newReq);
});

// Claim Request by Buyer
app.put('/api/requests/:id/claim', (req, res) => {
  const { id } = req.params;
  const { buyerId } = req.body;
  const reqIndex = supplyRequests.findIndex((r) => r.id === id);
  if (reqIndex === -1) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  const claimedRequest = supplyRequests[reqIndex];
  if (!claimedRequest) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  const buyer = users.find((u) => u.id === buyerId);
  claimedRequest.assignedBuyerId = buyerId;
  claimedRequest.assignedBuyerName = buyer ? buyer.name : 'Comprador';
  claimedRequest.status = 'Asignada';
  claimedRequest.assignedAt = new Date().toISOString();

  saveData();
  broadcastUpdate('REQUEST_UPDATED', claimedRequest);
  res.json(claimedRequest);
});

// Update Request Status
app.put('/api/requests/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, buyerId } = req.body;
  const reqIndex = supplyRequests.findIndex((r) => r.id === id);
  if (reqIndex === -1) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  const targetReq = supplyRequests[reqIndex];
  if (!targetReq) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  targetReq.status = status;

  if (status === 'En Compra' && !targetReq.shoppingStartedAt) {
    targetReq.shoppingStartedAt = new Date().toISOString();
  } else if (status === 'Comprada' && !targetReq.purchasedAt) {
    targetReq.purchasedAt = new Date().toISOString();
  } else if (status === 'Entregada' && !targetReq.deliveredAt) {
    targetReq.deliveredAt = new Date().toISOString();
  } else if (status === 'Completada' && !targetReq.completedAt) {
    targetReq.completedAt = new Date().toISOString();
  }

  if (buyerId && !targetReq.assignedBuyerId) {
    const buyer = users.find((u) => u.id === buyerId);
    if (buyer) {
      targetReq.assignedBuyerId = buyer.id;
      targetReq.assignedBuyerName = buyer.name;
    }
  }

  let newPendingReq: SupplyRequest | null = null;

  if (['Comprada', 'Entregada', 'Completada'].includes(status)) {
    const unpurchasedItems = targetReq.items.filter((i) => !i.purchased);
    const purchasedItems = targetReq.items.filter((i) => i.purchased);

    if (unpurchasedItems.length > 0 && purchasedItems.length > 0) {
      targetReq.items = purchasedItems;

      requestCounter += 1;
      newPendingReq = {
        id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        requestNumber: requestCounter,
        restaurantId: targetReq.restaurantId,
        restaurantName: targetReq.restaurantName,
        createdByUserId: targetReq.createdByUserId,
        createdByUserName: targetReq.createdByUserName,
        status: 'Pendiente',
        urgent: targetReq.urgent,
        notes: `Generada automáticamente por ${unpurchasedItems.length} insumos faltantes de Solicitud #${targetReq.requestNumber}.`,
        createdAt: new Date().toISOString(),
        items: unpurchasedItems.map((it, idx) => ({
          ...it,
          id: `ri-${Date.now()}-${idx}`,
          purchased: false,
          purchasedAt: undefined,
          itemNote: undefined,
        })),
      };

      supplyRequests.unshift(newPendingReq);
      broadcastUpdate('REQUEST_CREATED', newPendingReq);
    } else if (purchasedItems.length === 0) {
      targetReq.status = 'Pendiente';
      targetReq.assignedBuyerId = undefined;
      targetReq.assignedBuyerName = undefined;
    }
  }

  saveData();
  broadcastUpdate('REQUEST_UPDATED', targetReq);
  res.json({ request: targetReq, newPendingRequest: newPendingReq });
});

// Item check off during Shopping Mode
app.put('/api/requests/:requestId/items/:itemId', (req, res) => {
  const { requestId, itemId } = req.params;
  const { purchased, itemNote, boughtQty } = req.body;

  const targetReq = supplyRequests.find((r) => r.id === requestId);
  if (!targetReq) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const targetItem = targetReq.items.find((i) => i.id === itemId);
  if (!targetItem) return res.status(404).json({ error: 'Item no encontrado' });

  targetItem.purchased = purchased !== undefined ? purchased : targetItem.purchased;
  if (purchased) {
    targetItem.purchasedAt = new Date().toISOString();
  }
  if (itemNote !== undefined) targetItem.itemNote = itemNote;
  if (boughtQty !== undefined) targetItem.boughtQty = boughtQty;

  const allPurchased = targetReq.items.every((i) => i.purchased);
  if (allPurchased && targetReq.status === 'En Compra') {
    targetReq.status = 'Comprada';
    targetReq.purchasedAt = new Date().toISOString();
  }

  saveData();
  broadcastUpdate('REQUEST_UPDATED', targetReq);
  res.json({ request: targetReq, item: targetItem });
});

// Daily Checklist Submission
app.post('/api/checklist', (req, res) => {
  const { restaurantId, userId, stockReadings, notes, urgent } = req.body;

  if (!stockReadings || typeof stockReadings !== 'object') {
    return res.status(400).json({ error: 'stockReadings requerido' });
  }

  const rest = restaurants.find((r) => r.id === restaurantId) || restaurants[0];
  const user = users.find((u) => u.id === userId) || users[0];
  if (!rest || !user) {
    return res.status(500).json({ error: 'No hay local o usuario disponible para registrar el checklist' });
  }

  const itemsToReplenish: RequestItem[] = [];

  Object.entries(stockReadings as Record<string, number>).forEach(([prodId, currentStock]) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    prod.currentStock = currentStock;
    prod.updatedAt = new Date().toISOString();

    const needsReplenishment = currentStock < prod.minThreshold;

    auditLogs.push({
      id: `audit-${Date.now()}-${prodId}`,
      restaurantId: rest.id,
      productId: prod.id,
      productName: prod.name,
      recordedQty: currentStock,
      minThreshold: prod.minThreshold,
      needsReplenishment,
      recordedByUserId: user.id,
      recordedByUserName: user.name,
      timestamp: new Date().toISOString(),
    });

    if (needsReplenishment) {
      const needed = Math.max(1, prod.minThreshold - currentStock + prod.suggestedQuantity);
      itemsToReplenish.push({
        id: `ri-${Date.now()}-${prod.id}`,
        productId: prod.id,
        productName: prod.name,
        category: prod.category,
        unit: prod.unit,
        currentStockAtRequest: currentStock,
        minThreshold: prod.minThreshold,
        requestedQty: needed,
        suggestedSupplier: prod.suggestedSupplier,
        purchased: false,
      });
    }
  });

  let createdRequest: SupplyRequest | null = null;

  if (itemsToReplenish.length > 0) {
    requestCounter += 1;
    const defaultNote = `Generada automáticamente desde Checklist Diaria. ${itemsToReplenish.length} productos bajo mínimo.`;
    const finalNotes = notes ? `${notes} (${defaultNote})` : defaultNote;

    createdRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      requestNumber: requestCounter,
      restaurantId: rest.id,
      restaurantName: rest.name,
      createdByUserId: user.id,
      createdByUserName: user.name,
      status: 'Pendiente',
      urgent: urgent !== undefined ? Boolean(urgent) : itemsToReplenish.some((i) => i.currentStockAtRequest === 0),
      notes: finalNotes,
      createdAt: new Date().toISOString(),
      items: itemsToReplenish,
    };
    supplyRequests.unshift(createdRequest);
    broadcastUpdate('REQUEST_CREATED', createdRequest);
  }

  saveData();

  res.json({
    success: true,
    itemsAuditCount: Object.keys(stockReadings).length,
    replenishmentCount: itemsToReplenish.length,
    request: createdRequest,
  });
});

// Notifications Endpoint
app.post('/api/notifications/trigger', (req, res) => {
  const { title, body, targetRole, restaurantId } = req.body;
  const payload = {
    title: title || 'Alerta de Abastecimiento',
    body: body || 'Nueva solicitud pendiente',
    targetRole,
    restaurantId,
    timestamp: new Date().toISOString(),
  };

  broadcastUpdate('NOTIFICATION_ALERT', payload);
  res.json({ success: true, payload });
});

// Audit & Analytics
app.get('/api/analytics', (req, res) => {
  const totalRequests = supplyRequests.length;
  const pendingRequests = supplyRequests.filter((r) => r.status === 'Pendiente').length;
  const inProgressRequests = supplyRequests.filter((r) => ['Asignada', 'En Compra'].includes(r.status)).length;
  const completedRequests = supplyRequests.filter((r) => ['Entregada', 'Completada'].includes(r.status)).length;

  const itemCounts: Record<string, number> = {};
  supplyRequests.forEach((r) => {
    r.items.forEach((item) => {
      itemCounts[item.productName] = (itemCounts[item.productName] || 0) + 1;
    });
  });

  const topRequestedItems = Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    totalRequests,
    pendingRequests,
    inProgressRequests,
    completedRequests,
    topRequestedItems,
    recentAuditsCount: auditLogs.length,
  });
});

// --- Vite / Static Server Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SupplyFlow running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
