/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  QrCode,
  Tag,
  ArrowLeft,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Building,
  CheckCircle,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CommunityRegistrationFormProps {
  onBack: () => void;
}

export default function CommunityRegistrationForm({ onBack }: CommunityRegistrationFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [screenshotBase64, setScreenshotBase64] = useState("");
  const [screenshotName, setScreenshotName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredItem, setRegisteredItem] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPrice = isPromoApplied ? 444 : 999;

  // Custom QR Code Generator using qr-code styling (Google Charts QR Code API for premium visual fidelity)
  const upiId = import.meta.env.VITE_UPI_ID || "pallapothuyaswantth@okicici";
  const upiPayload = `upi://pay?pa=${upiId}&pn=Z444%20EdTech&am=${currentPrice}&cu=INR&tn=Z444%20Community%20Enrollment`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiPayload)}&color=0f172a&bgcolor=ffffff`;

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === "Z444") {
      setIsPromoApplied(true);
      const newErrors = { ...errors };
      delete newErrors.promo;
      setErrors(newErrors);
    } else {
      setIsPromoApplied(false);
      setErrors(prev => ({ ...prev, promo: "Invalid discount promo code. Hint: Use 'Z444'" }));
    }
  };

  const processFile = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors(prev => ({ ...prev, screenshot: "Please upload an image file (PNG, JPG, or WEBP)." }));
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, screenshot: "Image size limit is 8MB. Please compress and upload again." }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setScreenshotBase64(reader.result);
        setScreenshotName(file.name);
        setErrors(prev => {
          const updated = { ...prev };
          delete updated.screenshot;
          return updated;
        });
      }
    };
    reader.onerror = () => {
      setErrors(prev => ({ ...prev, screenshot: "Failed to read screenshot file." }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const removeScreenshot = () => {
    setScreenshotBase64("");
    setScreenshotName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = (): boolean => {
    const tempErrors: Record<string, string> = {};

    if (!name.trim()) {
      tempErrors.name = "Your full name is required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      tempErrors.email = "Please input a valid email ID";
    }

    const phoneRegex = /^[+]?[0-9\s\-()]{8,15}$/;
    if (!phone.trim() || !phoneRegex.test(phone.trim())) {
      tempErrors.phone = "Provide a valid 8-15 digit active WhatsApp phone number";
    }

    if (!screenshotBase64) {
      tempErrors.screenshot = "Payment confirmation screenshot is required before submitting.";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/community/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          paymentScreenshot: screenshotBase64,
          amountPaid: currentPrice,
          promoApplied: isPromoApplied ? "Z444" : ""
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setRegisteredItem(data.registration);
        setIsSuccess(true);
      } else {
        setApiError(data.message || "Something went wrong during submission. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setApiError("Network timeout or connection failure. Please review your internet link and retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess && registeredItem) {
    return (
      <div id="receipt-screen" className="max-w-2xl mx-auto space-y-8 animate-fade-in text-slate-850 dark:text-slate-100 p-2">
        <div className="bg-gradient-to-b from-indigo-50 to-indigo-50/20 dark:from-indigo-950/20 dark:to-indigo-950/5 border border-indigo-100 dark:border-indigo-900/40 p-8 rounded-3xl text-center shadow-lg relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-600/20">
            <CheckCircle className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Application Received!</h2>
          <p className="text-slate-700 dark:text-slate-300 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            Excellent, <strong className="text-slate-900 dark:text-white">{registeredItem.name}</strong>! Your WhatsApp Community registration details and payment proof have been successfully recorded.
          </p>
        </div>

        {/* Masterclass session details & quick actions card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 md:p-8 space-y-6 transition-colors duration-300">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Verification Pipeline
          </h3>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
            <div className="flex gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-pulse" />
              <div>
                <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Enrollment Status: Pending Review</p>
                <p className="text-sm font-semibold text-slate-950 dark:text-white mt-0.5">Verification within 1-2 hours</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal mt-1">
                  Our admissions coordinators are dynamically validating your fee screenshot credentials. Once approved, you will be added directly to the private WhatsApp community and receive a verification email!
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-450 block font-semibold mb-0.5">Applicant Email:</span>
              <strong className="text-slate-900 dark:text-slate-100 font-bold">{registeredItem.email}</strong>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-450 block font-semibold mb-0.5">Amount Recorded:</span>
              <strong className="text-slate-900 dark:text-slate-100 font-bold">INR {registeredItem.amountPaid}</strong>
            </div>
          </div>

          <div className="bg-amber-500/10 text-amber-900 dark:text-amber-200 rounded-xl p-4 text-xs font-medium space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <HelpCircle className="w-4 h-4 shrink-0 text-amber-600" /> Need Instant Help?
            </p>
            <p>If you have any questions or did not hear back within 1-2 hours, please feel free to write to us directly at <strong>444edtech@gmail.com</strong>.</p>
          </div>

          <button 
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Student Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="community-registration-card" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px] transition-colors duration-300">
      
      {/* Sidebar Info Section */}
      <div className="lg:col-span-12 xl:col-span-5 lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
        
        {/* Abstract design elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Premium Access Enrollment
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl lg:text-3xl font-black leading-tight tracking-tight text-white">Join Z444's community</h2>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              Get active personal guidance, algorithm-bypassing resume audits, custom mock interview sequences, continuous direct job postings, and a community of active peers that actually helps you get hired!
            </p>
          </div>

          <div className="border-t border-slate-800/80 pt-6 space-y-4">
            <h4 className="text-xs uppercase font-extrabold text-indigo-400 tracking-wider">Premium Access Inclusions:</h4>
            
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>1-on-1 Personal Guidance</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Interactive Resume Reviews</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Mock HR & Technical Interviews</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Immediate Curated Job Opportunities</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="relative z-10 pt-10 mt-10 border-t border-slate-800 text-[11px] text-slate-400 font-medium space-y-2">
          <p className="flex items-center gap-1 font-bold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secured Payment Dispatch
          </p>
          <p className="text-slate-400 leading-normal">
            We verify transactions manually in real-time. Once validated, you will be added directly to our private WhatsApp group.
          </p>
        </div>
      </div>

      {/* Main Registration and Payment section */}
      <div className="lg:col-span-12 xl:col-span-7 lg:col-span-7 p-8 lg:p-12 flex flex-col justify-between">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Active Admission Form</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold font-medium">Input your details accurately to register your membership.</p>
          </div>

          {apiError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 rounded-xl text-xs flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-semibold">{apiError}</p>
            </div>
          )}

          {/* Form Fields container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Name */}
            <div className="space-y-1.5">
              <label htmlFor="name-field" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  id="name-field"
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sai Ram Charan"
                  className={`w-full text-xs pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border ${errors.name ? "border-rose-500 bg-rose-50/20 dark:border-rose-800" : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"} focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 dark:focus:border-indigo-600 focus:outline-none rounded-xl transition-all`}
                />
              </div>
              {errors.name && <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">{errors.name}</p>}
            </div>

            {/* Input Email */}
            <div className="space-y-1.5">
              <label htmlFor="email-field" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  id="email-field"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. personal@gmail.com"
                  className={`w-full text-xs pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border ${errors.email ? "border-rose-500 bg-rose-50/20 dark:border-rose-800" : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"} focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 dark:focus:border-indigo-600 focus:outline-none rounded-xl transition-all`}
                />
              </div>
              {errors.email && <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">{errors.email}</p>}
            </div>

            {/* Input Phone */}
            <div className="space-y-1.5">
              <label htmlFor="phone-field" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Active WhatsApp Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  id="phone-field"
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9100152939"
                  className={`w-full text-xs pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border ${errors.phone ? "border-rose-500 bg-rose-50/20 dark:border-rose-800" : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"} focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 dark:focus:border-indigo-600 focus:outline-none rounded-xl transition-all`}
                />
              </div>
              {errors.phone && <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">{errors.phone}</p>}
            </div>

            {/* Promo Code Option */}
            <div className="space-y-1.5">
              <label htmlFor="promo-field" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Coupon Promo Code</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    id="promo-field"
                    type="text" 
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="e.g. Z444"
                    disabled={isPromoApplied}
                    className="w-full text-xs pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-all focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={isPromoApplied || !promoCode.trim()}
                  className="px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {isPromoApplied && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 mt-1">
                  ✓ Promo Code 'Z444' applied successfully! Dropped price to INR 444
                </p>
              )}
              {errors.promo && <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">{errors.promo}</p>}
            </div>
          </div>

          {/* Pricing Banner Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-250 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold tracking-wider text-slate-500 dark:text-slate-400 uppercase block">Total Enrollment Fee</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-905 dark:text-white">INR {currentPrice}</span>
                {isPromoApplied && (
                  <span className="text-xs text-slate-400 line-through">INR 999</span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold">
                {isPromoApplied ? "75% PROMO OFF" : "STANDARD RATE"}
              </span>
            </div>
          </div>

          {/* Payment Link Launcher Block */}
          <div className="space-y-4 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl bg-white dark:bg-slate-950 transition-colors duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl shrink-0 text-indigo-500">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">Fast Mobile UPI Payments</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-normal font-semibold">
                  Click below to open UPI apps installed on your phone (Google Pay, PhonePe, Paytm, or BHIM) to transact securely.
                </p>
              </div>
            </div>

            {/* Intent links selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <a
                href={upiPayload}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-colors shadow-sm"
              >
                ⚡ Link GPay / PhonePe / Paytm
                <ExternalLink className="w-3.5 h-3.5 whitespace-nowrap shrink-0" />
              </a>

              {/* Scan option */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-1.5 rounded-xl">
                <QrCode className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <div className="text-left">
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block uppercase">UPI address fallback</span>
                  <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">{upiId}</span>
                </div>
              </div>
            </div>

            {/* Desktop Visual QR code styling */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
              <div className="bg-white p-2.5 rounded-xl border border-slate-250 dark:border-slate-800 shadow-sm shrink-0">
                <img 
                  src={qrCodeUrl} 
                  alt="Z444 UPI QR Code" 
                  className="w-24 h-24 select-none rounded"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">Paying on Desktop? Scan QR code</p>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal max-w-sm">
                  Open GPay, PhonePe, Paytm, or any UPI banking app on your smartphone, select <strong>Scan QR</strong>, and complete the payment of <strong>INR {currentPrice}</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Screenshot drag and drop upload block */}
          <div className="space-y-2">
            <span className="block text-xs font-extrabold text-slate-705 dark:text-slate-300">
              Upload Payment Confirmation Screenshot
            </span>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all ${
                dragActive 
                  ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10" 
                  : screenshotBase64 
                    ? "border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" 
                    : "border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 hover:bg-slate-50 dark:hover:bg-slate-950/15"
              }`}
            >
              <input
                ref={fileInputRef}
                id="file-upload-input"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />

              {!screenshotBase64 ? (
                <div className="text-center space-y-3 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mx-auto text-slate-400 dark:text-slate-300 shadow-sm">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-250">
                      Drag & drop payment screenshot here, or <span className="text-indigo-600 dark:text-indigo-400 hover:underline">browse files</span>
                    </p>
                    <p className="text-[10px] text-slate-550 dark:text-slate-400 font-semibold mt-1">Supports PNG, JPG, or WEBP images up to 8MB</p>
                  </div>
                </div>
              ) : (
                <div className="w-full flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                      <img 
                        src={screenshotBase64} 
                        alt="Screenshot Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{screenshotName}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready for upload submission
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeScreenshot}
                    className="px-3.5 py-1.5 border border-slate-250 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-red-600 dark:text-red-400 font-bold text-[10px] rounded-xl transition-all cursor-pointer select-none"
                  >
                    Delete file
                  </button>
                </div>
              )}
            </div>

            {errors.screenshot && (
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 inline" /> {errors.screenshot}
              </p>
            )}
          </div>

          {/* Form Actions footer */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3.5 text-center font-bold text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-950 dark:hover:bg-slate-850 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Submitting info ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Submit Premium Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
