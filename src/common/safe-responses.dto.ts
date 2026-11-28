import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderItemAssignment } from '../orders/entities/order-item-assignment.entity';
import { Review } from '../review/entities/review.entity';
import { toSafeUser } from './safe-user.dto';

export interface SafeServiceTypeDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
  basePrice: number;
  isActive: boolean;
}

export interface SafeAssignmentDto {
  id: number;
  orderItemId: number;
  assistantId: number;
  assistant: { id: number; fullName: string; email: string; phone: string | null } | null;
  status: string;
  offeredAt: Date;
  respondedAt: Date | null;
}

export interface SafeOrderItemDto {
  id: number;
  orderId: number;
  serviceTypeId: number;
  serviceType: SafeServiceTypeDto | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  details: string | null;
  assignments: SafeAssignmentDto[];
}

export interface SafeOrderDto {
  id: number;
  customerId: number;
  customer: { id: number; fullName: string; email: string } | null;
  addressId: number;
  address: { id: number; addressLine: string; city: string } | null;
  promotionId: number | null;
  status: string;
  subtotal: number;
  discountAmount: number;
  totalPrice: number;
  addressSnapshot: string | null;
  scheduledAt: Date | null;
  createdAt: Date;
  items: SafeOrderItemDto[];
}

function toSafeServiceType(st: any): SafeServiceTypeDto | null {
  if (!st) return null;
  return {
    id: st.id,
    code: st.code,
    name: st.name,
    description: st.description ?? null,
    basePrice: Number(st.basePrice),
    isActive: st.isActive,
  };
}

function toSafeAssignment(a: OrderItemAssignment): SafeAssignmentDto {
  const u = toSafeUser(a.assistant);
  return {
    id: a.id,
    orderItemId: a.orderItemId,
    assistantId: a.assistantId,
    assistant: u ? { id: u.id, fullName: u.fullName, email: u.email, phone: u.phone } : null,
    status: a.status,
    offeredAt: a.offeredAt,
    respondedAt: a.respondedAt,
  };
}

function toSafeOrderItem(item: OrderItem): SafeOrderItemDto {
  return {
    id: item.id,
    orderId: item.orderId,
    serviceTypeId: item.serviceTypeId,
    serviceType: toSafeServiceType(item.serviceType),
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    subtotal: Number(item.subtotal),
    discountAmount: Number(item.discountAmount),
    total: Number(item.total),
    status: item.status,
    startedAt: item.startedAt,
    completedAt: item.completedAt,
    details: item.details,
    assignments: (item.assignments || []).map(toSafeAssignment),
  };
}

export function toSafeOrder(order: Order): SafeOrderDto {
  const c = toSafeUser(order.customer);
  return {
    id: order.id,
    customerId: order.customerId,
    customer: c ? { id: c.id, fullName: c.fullName, email: c.email } : null,
    addressId: order.addressId,
    address: order.address
      ? { id: order.address.id, addressLine: order.address.addressLine, city: order.address.city }
      : null,
    promotionId: order.promotionId,
    status: order.status,
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount),
    totalPrice: Number(order.totalPrice),
    addressSnapshot: order.addressSnapshot,
    scheduledAt: order.scheduledAt,
    createdAt: order.createdAt,
    items: (order.items || []).map(toSafeOrderItem),
  };
}

export function toSafeOrderArray(orders: Order[]): SafeOrderDto[] {
  return orders.map(toSafeOrder);
}

export interface SafeReviewDto {
  id: number;
  orderId: number;
  customerId: number;
  customer: { id: number; fullName: string } | null;
  assistantId: number;
  assistant: { id: number; fullName: string } | null;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export function toSafeReview(review: Review): SafeReviewDto {
  const c = toSafeUser(review.customer);
  const a = toSafeUser(review.assistant);
  return {
    id: review.id,
    orderId: review.orderId,
    customerId: review.customerId,
    customer: c ? { id: c.id, fullName: c.fullName } : null,
    assistantId: review.assistantId,
    assistant: a ? { id: a.id, fullName: a.fullName } : null,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
  };
}

export function toSafeReviewArray(reviews: Review[]): SafeReviewDto[] {
  return reviews.map(toSafeReview);
}
