/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { StudentRegistration, ValidationErrors } from "../types";
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertCircle,
  FileText,
  Search,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RegistrationFormProps {
  onSuccess: (data: {
    registration: StudentRegistration;
    simulatedEmail: string;
    cloudSync: boolean;
    emailSent: boolean;
  }) => void;
}

export default function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [btechYear, setBtechYear] = useState<"1" | "2" | "3" | "4" | "Completed" | "">("");
  const [department, setDepartment] = useState("");
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Name validations
    if (!name.trim()) {
      newErrors.name = "Full name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters long";
    } else if (name.trim().length > 100) {
      newErrors.name = "Name cannot exceed 100 characters";
    }

    // Email validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = "Provide a valid email address (e.g., student@domain.com)";
    }

    // Phone validations
    const cleanPhone = phone.trim();
    const phoneRegex = /^[+]?[0-9\s\-()]{8,15}$/;
    if (!cleanPhone) {
      newErrors.phone = "Phone number is required";
    } else if (!phoneRegex.test(cleanPhone)) {
      newErrors.phone = "Provide a valid 8-15 digit phone (e.g., +919876543210)";
    }

    // B.Tech Year validation
    if (!btechYear) {
      newErrors.btechYear = "Please select your B.Tech study year";
    }

    // Department validation
    if (!department.trim()) {
      newErrors.department = "Department is required (e.g., CSE, ECE, EEE)";
    } else if (department.trim().length < 2) {
      newErrors.department = "Department name is too short";
    } else if (department.trim().length > 50) {
      newErrors.department = "Department name is too long";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          btechYear,
          department: department.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onSuccess({
          registration: result.data,
          simulatedEmail: result.simulatedEmailContent,
          cloudSync: result.cloudSync,
          emailSent: result.emailSent,
        });
      } else {
        setApiError(result.message || "Registration failed. Please check inputs and try again.");
      }
    } catch (err) {
      console.error("Submission failed:", err);
      setApiError("Failed to connect to registration server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="registration-card" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-850 shadow-2xl shadow-indigo-100/50 dark:shadow-none overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px] transition-colors duration-300">
      
      {/* Sidebar Session Overview info */}
      <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
        
        {/* Abstract background decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
 
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Limited Seats Webinar
          </div>
 
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Z444 Masterclass
          </h2>
          <p className="text-indigo-200/90 text-sm font-medium leading-relaxed mb-8">
            Let's bridge the massive gap between college studies and authentic premium industry expectations! Accelerate your career right after B.Tech.
          </p>
 
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-white/10 rounded-xl border border-white/10 shrink-0 text-indigo-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-white">Curriculum Tuning</h4>
                <p className="text-xs text-indigo-200/70 mt-1">Resume masterclass, drafting A-grade profiles, & portfolio frameworks.</p>
              </div>
            </div>
 
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-white/10 rounded-xl border border-white/10 shrink-0 text-indigo-300">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Job Search Weapons</h3>
                <p className="text-xs text-indigo-200/70 mt-1">Cold emailing workflows, direct outreach strategies, and LinkedIn targeting.</p>
              </div>
            </div>
 
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-white/10 rounded-xl border border-white/10 shrink-0 text-indigo-300">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-white">Internships & Job Cracking</h4>
                <p className="text-xs text-indigo-200/70 mt-1">Practical technical skillsets, essential stacks, and cracked interview models.</p>
              </div>
            </div>
          </div>
        </div>
 
        {/* Schedule box footer */}
        <div className="mt-12 lg:mt-0 pt-8 border-t border-white/10 relative z-10">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[10px] text-indigo-200/60 uppercase font-semibold">Date</p>
                <p className="text-xs font-bold text-white">June 7th, 2026</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[10px] text-indigo-200/60 uppercase font-semibold">Time</p>
                <p className="text-xs font-bold text-white">11:00 AM IST</p>
              </div>
            </div>
          </div>
 
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
            <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs text-indigo-200/80 font-medium">Remote via live Google Meet invite link</span>
          </div>
        </div>
      </div>
 
      {/* Main Registration Form Area */}
      <form onSubmit={handleSubmit} className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-white dark:bg-slate-900 transition-colors duration-300">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Student Registration Portal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Provide your authentic details to secure your masterclass seat.</p>
        </div>
 
        {apiError && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/35 border border-rose-100 dark:border-rose-900/40 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex gap-3 items-center">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}
 
        <div className="space-y-5">
          {/* Name Field */}
          <div>
            <label htmlFor="student-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Student Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 dark:text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                id="student-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your first and last name"
                className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border ${errors.name ? "border-rose-400 dark:border-rose-500/80 focus:ring-rose-500/20" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-100/30"} rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-4 focus:outline-none transition-all duration-200`}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-rose-600 dark:bg-rose-400" />
                {errors.name}
              </p>
            )}
          </div>
 
          {/* Email / Mail ID Field */}
          <div>
            <label htmlFor="student-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Mail Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 dark:text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="student-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border ${errors.email ? "border-rose-400 dark:border-rose-500/80 focus:ring-rose-500/20" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-100/30"} rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-4 focus:outline-none transition-all duration-200`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-rose-600 dark:bg-rose-400" />
                {errors.email}
              </p>
            )}
          </div>
 
          {/* Phone Number Field */}
          <div>
            <label htmlFor="student-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Phone Number</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 dark:text-slate-500">
                <Phone className="w-4 h-4" />
              </span>
              <input
                id="student-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 or 10-digit phone"
                className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border ${errors.phone ? "border-rose-400 dark:border-rose-500/80 focus:ring-rose-500/20" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-100/30"} rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-4 focus:outline-none transition-all duration-200`}
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-rose-600 dark:bg-rose-400" />
                {errors.phone}
              </p>
            )}
          </div>
 
          {/* B.Tech Year & Department Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Year selector */}
            <div>
              <label htmlFor="student-btech-year" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">B.Tech Year</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
                  <GraduationCap className="w-4 h-4" />
                </span>
                <select
                  id="student-btech-year"
                  value={btechYear}
                  onChange={(e) => setBtechYear(e.target.value as any)}
                  className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border ${errors.btechYear ? "border-rose-400 dark:border-rose-500/80 focus:ring-rose-500/20" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-100/30"} rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-4 focus:outline-none transition-all duration-200 appearance-none`}
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Study Year</option>
                  <option value="1" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">1st Year</option>
                  <option value="2" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">2nd Year</option>
                  <option value="3" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">3rd Year</option>
                  <option value="4" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">4th Year (Final Year)</option>
                  <option value="Completed" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Completed / Graduate</option>
                </select>
                <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none text-[10px]">
                  ▼
                </span>
              </div>
              {errors.btechYear && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-rose-600 dark:bg-rose-400" />
                  {errors.btechYear}
                </p>
              )}
            </div>
 
            {/* Department input */}
            <div>
              <label htmlFor="student-department" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Department</label>
              <input
                id="student-department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. CSE, ECE, Mechanical"
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border ${errors.department ? "border-rose-400 dark:border-rose-500/80 focus:ring-rose-500/20" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-100/30"} rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-4 focus:outline-none transition-all duration-200`}
              />
              {errors.department && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-rose-600 dark:bg-rose-400" />
                  {errors.department}
                </p>
              )}
            </div>
 
          </div>
        </div>
 
        <button
          id="btn-register"
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl focus:ring-4 focus:ring-indigo-100/20 focus:outline-none cursor-pointer transition-all duration-200 flex justify-center items-center gap-2 shadow-lg shadow-indigo-600/10 enabled:active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying and Registering Seat...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Registration</span>
            </>
          )}
        </button>
 
        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-4 leading-relaxed font-medium">
          By registering, you represent that your details are valid. A registration receipt will be sent to the student and coordinator emails immediately.
        </p>
 
      </form>
    </div>
  );
}
