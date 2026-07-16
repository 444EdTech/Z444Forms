import React, { useState, useRef } from "react";
import Z444Logo from "./Z444Logo";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Share2, 
  Copy, 
  Check, 
  Loader2, 
  Phone, 
  User, 
  Briefcase, 
  GraduationCap, 
  School,
  Link,
  Sun,
  Moon,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function ResumeSubmissionForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState<"1" | "2" | "3" | "4" | "">("");
  const [branch, setBranch] = useState("");
  const [collegeName, setCollegeName] = useState("");
  
  // Resume state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeBase64, setResumeBase64] = useState<string>("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File processing helper
  const processFile = (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      setError("Resume file must be smaller than 15MB");
      return;
    }
    
    setResumeFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setResumeBase64(reader.result as string);
    };
    reader.onerror = () => {
      setError("Failed to read the file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return setError("Please input your full name");
    if (!phone.trim()) return setError("Please input your phone number");
    if (!yearOfStudy) return setError("Please select your Year of Study");
    if (!branch.trim()) return setError("Please input your branch/department");
    if (!collegeName.trim()) return setError("Please input your college name");
    
    if (!resumeBase64 && !resumeUrl.trim()) {
      return setError("Please either upload a resume file or provide a resume link.");
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          yearOfStudy,
          branch: branch.trim(),
          collegeName: collegeName.trim(),
          resumeFileName: resumeFile ? resumeFile.name : null,
          resumeFileBase64: resumeBase64 || null,
          resumeUrl: resumeUrl.trim() || null
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitSuccess(true);
      } else {
        setError(result.message || "Failed to submit form. Please check details and try again.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyShare = () => {
    const shareText = `Hey! I just submitted my profile and resume to Z444. Check out their portal here: ${window.location.origin}`;
    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const shareTextEncoded = encodeURIComponent(`Hey! I just submitted my profile and resume to Z444. Check out their portal here: ${window.location.origin}`);

  return (
    <div className="max-w-xl mx-auto w-full z-10 relative">
      <AnimatePresence mode="wait">
        {!submitSuccess ? (
          <motion.div
            key="form-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 shadow-xl rounded-3xl p-6 md:p-8 space-y-6"
          >
            {/* Logo & Heading */}
            <div className="text-center space-y-3">
              <Z444Logo variant="black-bg" size={64} className="mx-auto shadow-lg hover:scale-110 transition-transform" />
              <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Student Registration</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Please provide your details and submit your resume below</p>
              </div>
            </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl text-center">
                    {error}
                  </div>
                )}

                {/* Form fields */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Phone number field */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 9876543210"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Year of study dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        Year of Study
                      </label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                          required
                          value={yearOfStudy}
                          onChange={(e) => setYearOfStudy(e.target.value as any)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-white appearance-none cursor-pointer"
                        >
                          <option value="">Select Year</option>
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                        </select>
                      </div>
                    </div>

                    {/* Branch / Department */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        Branch
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          placeholder="e.g. CSE, ECE"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* College Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      College Name
                    </label>
                    <div className="relative">
                      <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        placeholder="e.g. IIT Delhi, VIT"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Resume Section */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Resume (Upload or Link)
                    </label>

                    {/* Drag and Drop File Area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={triggerFileSelect}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${
                        isDragging 
                          ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20" 
                          : resumeFile 
                            ? "border-emerald-500/70 bg-emerald-50/10 dark:bg-emerald-950/10" 
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-750 bg-slate-50/50 dark:bg-slate-950/40"
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                      />
                      
                      {resumeFile ? (
                        <div className="flex flex-col items-center space-y-1">
                          <FileText className="w-8 h-8 text-emerald-500 animate-pulse" />
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[280px]">
                            {resumeFile.name}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB • Click to replace
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-1">
                          <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Drag & drop your resume file here
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            Supports PDF, DOC, DOCX (Max 15MB) or select manually
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Resume URL Link (Alternative) */}
                    <div className="relative mt-2">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Link className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="url"
                        value={resumeUrl}
                        onChange={(e) => setResumeUrl(e.target.value)}
                        placeholder="Or paste a Google Drive / LinkedIn resume URL"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Profile...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Details</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 shadow-xl rounded-3xl p-8 space-y-6 text-center"
              >
                {/* Success Indicator */}
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Thank you!</h2>
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">Successfully submitted form!</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
                    Hi <strong>{name}</strong>, your student profile and resume details have been received securely.
                  </p>
                </div>

                {/* Share Box */}
                <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-850 p-4 space-y-4">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Do you want to share it with your friends?
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Copy Link Button */}
                    <button
                      onClick={handleCopyShare}
                      className="flex-1 py-3 px-4 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
                    >
                      {copiedShare ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Copy Portal Invite</span>
                        </>
                      )}
                    </button>

                    {/* WhatsApp Button */}
                    <a
                      href={`https://api.whatsapp.com/send?text=${shareTextEncoded}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-3 px-4 bg-[#25d366]/10 hover:bg-[#25d366]/20 border border-[#25d366]/30 text-[#25d366] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share on WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Submit another profile */}
                <button
                  onClick={() => {
                    setName("");
                    setPhone("");
                    setYearOfStudy("");
                    setBranch("");
                    setCollegeName("");
                    setResumeFile(null);
                    setResumeBase64("");
                    setResumeUrl("");
                    setSubmitSuccess(false);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Submit another registration
                </button>
              </motion.div>
            )}
          </AnimatePresence>
    </div>
  );
}
