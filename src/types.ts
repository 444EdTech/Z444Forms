/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StudentRegistration {
  id: string;
  name: string;
  email: string;
  phone: string;
  btechYear: "1" | "2" | "3" | "4" | "Completed";
  department: string;
  createdAt: string;
}

export interface StudentFeedback {
  id: string;
  name: string;
  email: string;
  rating: number;
  comments: string;
  createdAt: string;
}

export interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  btechYear?: string;
  department?: string;
  rating?: string;
  comments?: string;
}

export interface CommunityRegistration {
  id: string;
  name: string;
  email: string;
  phone: string;
  paymentScreenshot: string;
  amountPaid: number;
  promoApplied: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}
