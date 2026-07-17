/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { 
  User, 
  Phone, 
  Mail,
  GraduationCap, 
  BookOpen, 
  School,
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  X,
  FileDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NewRegistrationFormProps {
  onSuccess?: (data: any) => void;
}

export default function NewRegistrationForm({ onSuccess }: NewRegistrationFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState<"1" | "2" | "3" | "4" | "">("");
  const [branch, setBranch] = useState("");
  const [collegeName, setCollegeName] = useState("");
  
  // Resume File State
  const [resumeBase64, setResumeBase64] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [resumeType, setResumeType] = useState("");
  const [resumeSize, setResumeSize] = useState<number | null>(null);
  
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;

    // Check size limit (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, resume: "File size exceeds the 10MB limit." }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setResumeBase64(reader.result);
        setResumeName(file.name);
        setResumeType(file.type);
        setResumeSize(file.size);
        setErrors(prev => {
          const updated = { ...prev };
          delete updated.resume;
          return updated;
        });
      }
    };
    reader.onerror = () => {
      setErrors(prev => ({ ...prev, resume: "Failed to read file." }));
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

  const removeResume = () => {
    setResumeBase64("");
    setResumeName("");
    setResumeType("");
    setResumeSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validate = (): boolean => {
    const tempErrors: Record<string, string> = {};

    if (!name.trim()) {
      tempErrors.name = "Full name is required";
    } else if (name.trim().length < 2) {
      tempErrors.name = "Name must be at least 2 characters long";
    }

    const phoneRegex = /^[+]?[0-9\s\-()]{8,20}$/;
    if (!phone.trim()) {
      tempErrors.phone = "Phone number is required";
    } else if (!phoneRegex.test(phone.trim())) {
      tempErrors.phone = "Provide a valid phone number (e.g., +919876543210)";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      tempErrors.email = "Email address is required";
    } else if (!emailRegex.test(email.trim())) {
      tempErrors.email = "Provide a valid email ID (e.g., name@example.com)";
    }

    if (!yearOfStudy) {
      tempErrors.yearOfStudy = "Please select your year of study";
    }

    if (!branch.trim()) {
      tempErrors.branch = "Branch is required (e.g., CSE, Mechanical)";
    }

    if (!collegeName.trim()) {
      tempErrors.collegeName = "College/University name is required";
    }

    if (!resumeBase64) {
      tempErrors.resume = "Please upload your resume to complete submission";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/home-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          yearOfStudy,
          branch: branch.trim(),
          collegeName: collegeName.trim(),
          resume: {
            data: resumeBase64,
            name: resumeName,
            type: resumeType,
            size: resumeSize
          }
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmittedSuccessfully(true);
        if (onSuccess) {
          onSuccess(result.submission);
        }
      } else {
        setApiError(result.message || "Failed to submit form. Please check inputs and try again.");
      }
    } catch (err) {
      console.error("Home form submission failed:", err);
      setApiError("Failed to connect to submission server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div id="home-registration-container" className="max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {!submittedSuccessfully ? (
          <motion.div
            key="home-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl shadow-indigo-150/40 dark:shadow-none p-8 lg:p-10 transition-all"
          >
            {/* Header / Z444 Logo and Title */}
            <div className="text-center mb-8">
              <div className="inline-flex flex-col items-center justify-center gap-1.5 mb-4">
                <span className="text-4xl font-extrabold tracking-tighter bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 bg-clip-text text-transparent select-none">
                  Z444
                </span>
                <span className="h-0.5 w-12 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full" />
              </div>
              <h2 className="text-xl lg:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Submit Your Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1.5 leading-relaxed">
                Connect with our team to explore internship programs and expert-led engineering cohorts.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              
              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-950 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      errors.name 
                        ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200" 
                        : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-950/45"
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="text-[10.5px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                  Phone Number / WhatsApp
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g., +919876543210"
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-950 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      errors.phone 
                        ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200" 
                        : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-950/45"
                    }`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-[10.5px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g., rahul@example.com"
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-950 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      errors.email 
                        ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200" 
                        : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-950/45"
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[10.5px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Year of Study Button Radios */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                  Year of Study
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {(["1", "2", "3", "4"] as const).map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setYearOfStudy(year);
                        setErrors(prev => {
                          const updated = { ...prev };
                          delete updated.yearOfStudy;
                          return updated;
                        });
                      }}
                      className={`py-3 rounded-xl border text-xs font-extrabold transition-all duration-200 ${
                        yearOfStudy === year
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/15"
                          : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      {year} Year
                    </button>
                  ))}
                </div>
                {errors.yearOfStudy && (
                  <p className="text-[10.5px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.yearOfStudy}
                  </p>
                )}
              </div>

              {/* Branch Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                  Branch / Specialization
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g., Computer Science, Information Technology"
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-950 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      errors.branch 
                        ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200" 
                        : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-950/45"
                    }`}
                  />
                </div>
                {errors.branch && (
                  <p className="text-[10.5px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.branch}
                  </p>
                )}
              </div>

              {/* College Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                  College / Institute Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <School className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g., National Institute of Technology"
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-950 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      errors.collegeName 
                        ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200" 
                        : "border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-950/45"
                    }`}
                  />
                </div>
                {errors.collegeName && (
                  <p className="text-[10.5px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.collegeName}
                  </p>
                )}
              </div>

              {/* Resume File Upload Dropzone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                  Upload Resume
                </label>
                
                {!resumeBase64 ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      dragActive 
                        ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10" 
                        : "border-slate-250 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Click to upload or drag & drop
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Supports PDF, DOCX, DOC or JPG/PNG (Max 10MB)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-150/40 dark:border-indigo-900/30 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="max-w-[280px] sm:max-w-xs overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {resumeName}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {resumeSize ? formatBytes(resumeSize) : "Base64 payload"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeResume}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {errors.resume && (
                  <p className="text-[10.5px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.resume}
                  </p>
                )}
              </div>

              {/* Submit Error banner if any */}
              {apiError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex gap-3 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold">Submission Failed</h4>
                    <p className="text-[11px] mt-0.5 leading-relaxed">{apiError}</p>
                  </div>
                </div>
              )}

              {/* Form Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase hover:opacity-95 shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Profile...
                  </>
                ) : (
                  "Submit Profile"
                )}
              </button>

            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 lg:p-12 text-center shadow-2xl shadow-emerald-100/30 dark:shadow-none transition-all"
          >
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg lg:text-xl font-black text-slate-800 dark:text-white tracking-tight">
              Profile Submitted Successfully!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
              Thank you, <strong className="text-slate-700 dark:text-slate-200">{name}</strong>. Your academic profile has been logged inside our database securely. Our coordinators will review your resume and reach out on <strong className="text-slate-700 dark:text-slate-200">{phone}</strong> shortly.
            </p>

            <button
              onClick={() => {
                setSubmittedSuccessfully(false);
                setName("");
                setPhone("");
                setYearOfStudy("");
                setBranch("");
                setCollegeName("");
                removeResume();
              }}
              className="mt-8 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Submit Another Profile
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
