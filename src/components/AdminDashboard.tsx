/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { StudentRegistration } from "../types.js";
import { 
  Users, 
  Search, 
  RefreshCw, 
  Filter, 
  GraduationCap, 
  TrendingUp, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Clock, 
  Building2,
  Lock,
  Eye,
  CheckCircle,
  Database,
  MessageSquare,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminDashboard() {
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [communityRegistrations, setCommunityRegistrations] = useState<any[]>([]);
  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [activeDashboardTab, setActiveDashboardTab] = useState<"registrations" | "feedbacks" | "community">("registrations");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  useEffect(() => {
    const expiry = localStorage.getItem("urgency_email_cooldown_expiry");
    if (expiry) {
      const remaining = Math.max(0, Math.ceil((parseInt(expiry) - Date.now()) / 1000));
      if (remaining > 0) {
        setCooldownRemaining(remaining);
      }
    }
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          localStorage.removeItem("urgency_email_cooldown_expiry");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSendUrgencyReminder = async () => {
    if (cooldownRemaining > 0) return;
    if (!window.confirm("Are you sure you want to trigger the 'Few Hours Remaining' email reminder to all registered candidates? This will send an email alert advising them to get their notepad ready for Sunday at 11:00 AM IST.")) {
      return;
    }
    
    setIsSendingReminder(true);
    setError(null);
    try {
      const res = await fetch("/api/send-urgency-reminder", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessToast(json.message);
        setTimeout(() => setSuccessToast(null), 8500);
        
        // Setup 10-minute cooldown (600 seconds)
        const expiryTime = Date.now() + 10 * 60 * 1000;
        localStorage.setItem("urgency_email_cooldown_expiry", expiryTime.toString());
        setCooldownRemaining(600);
      } else {
        setError(json.error || "Failed to trigger email reminders.");
      }
    } catch (err) {
      console.error("Reminder trigger failed:", err);
      setError("An error occurred while connecting to the email service.");
    } finally {
      setIsSendingReminder(false);
    }
  };
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("All");
  const [selectedRating, setSelectedRating] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  
  // Analytics stats
  const [stats, setStats] = useState({
    total: 0,
    y1: 0,
    y2: 0,
    y3: 0,
    y4: 0,
    completed: 0,
  });

  const [departments, setDepartments] = useState<Record<string, number>>({});

  const fetchRegistrations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/registrations");
      const json = await res.json();
      if (res.ok && json.success) {
        const sorted = (json.registrations || []).sort(
          (a: StudentRegistration, b: StudentRegistration) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRegistrations(sorted);
        calculateStats(sorted);
      } else {
        setError(json.error || "Failed to fetch student entries.");
      }
    } catch (err) {
      console.error("Local fetch err:", err);
      setError("Failed to query student admissions registrar.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedbacks");
      const json = await res.json();
      if (res.ok && json.success) {
        const sorted = (json.feedbacks || []).sort(
          (a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setFeedbacks(sorted);
      } else {
        setError(json.error || "Failed to fetch feedback entries");
      }
    } catch (err) {
      console.error("Local feedback fetch err:", err);
      setError("Failed to query classroom feedbacks.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCommunityRegistrations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/community/registrations");
      const json = await res.json();
      if (res.ok && json.success) {
        setCommunityRegistrations(json.registrations || []);
      } else {
        setError(json.error || "Failed to fetch community entries.");
      }
    } catch (err) {
      console.error("Local community fetch err:", err);
      setError("Failed to query community registrations.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewCommunity = async (id: string, status: "approved" | "rejected") => {
    setIsProcessingAction(id);
    setError(null);
    try {
      const res = await fetch("/api/community/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id, status })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessToast(`Application is now successfully ${status}! Feedback status email dispatched.`);
        setTimeout(() => setSuccessToast(null), 4000);
        await fetchCommunityRegistrations();
      } else {
        setError(json.message || "Failed to update application review status.");
      }
    } catch (err) {
      console.error("Review community submit error:", err);
      setError("Network failure. Failed to complete review transaction.");
    } finally {
      setIsProcessingAction(null);
    }
  };

  const reloadData = async () => {
    if (activeDashboardTab === "registrations") {
      await fetchRegistrations();
    } else if (activeDashboardTab === "feedbacks") {
      await fetchFeedbacks();
    } else {
      await fetchCommunityRegistrations();
    }
  };

  const calculateStats = (data: StudentRegistration[]) => {
    const counts = {
      total: data.length,
      y1: 0,
      y2: 0,
      y3: 0,
      y4: 0,
      completed: 0,
    };

    const depCounts: Record<string, number> = {};

    data.forEach(item => {
      // Study Year counters
      if (item.btechYear === "1") counts.y1++;
      else if (item.btechYear === "2") counts.y2++;
      else if (item.btechYear === "3") counts.y3++;
      else if (item.btechYear === "4") counts.y4++;
      else if (item.btechYear === "Completed") counts.completed++;

      // Department counters
      const d = item.department.trim().toUpperCase();
      depCounts[d] = (depCounts[d] || 0) + 1;
    });

    setStats(counts);
    setDepartments(depCounts);
  };

  useEffect(() => {
    fetchRegistrations();
    fetchFeedbacks();
    fetchCommunityRegistrations();
  }, []);

  const filteredRegistrations = registrations.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm);

    const matchesYear = selectedYear === "All" || item.btechYear === selectedYear;

    return matchesSearch && matchesYear;
  });

  const filteredFeedbacks = feedbacks.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.comments.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRating = selectedRating === "All" || item.rating === Number(selectedRating);

    return matchesSearch && matchesRating;
  });

  const filteredCommunity = communityRegistrations.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      item.name.toLowerCase().includes(term) ||
      item.email.toLowerCase().includes(term) ||
      item.phone.includes(term) ||
      (item.promoApplied || "").toLowerCase().includes(term);

    const matchesStatus = selectedStatus === "All" || item.status === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-slate-900 border border-slate-850 text-white rounded-3xl relative overflow-hidden shadow-lg shadow-slate-950/10">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1.5 animate-pulse">
            <Lock className="w-3.5 h-3.5" />
            Authorized Control Panel
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Z444 Masterclass Workspace</h2>
          <p className="text-slate-400 text-xs mt-0.5">Dual-synchronized live student databases & reviewer journals</p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSendUrgencyReminder}
            disabled={isSendingReminder || cooldownRemaining > 0}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-60 text-xs font-extrabold rounded-xl flex items-center gap-2 border border-indigo-500/30 shadow-md cursor-pointer active:scale-95 transition-all outline-none font-bold"
          >
            <Clock className={`w-3.5 h-3.5 ${isSendingReminder || cooldownRemaining > 0 ? "animate-pulse" : ""}`} />
            {isSendingReminder 
              ? "Sending..." 
              : cooldownRemaining > 0 
                ? `Resend in ${formatCooldown(cooldownRemaining)}` 
                : "Send Urgency Reminder Email"
            }
          </button>

          <button
            onClick={reloadData}
            disabled={isLoading}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700/60 cursor-pointer active:scale-95 transition-all outline-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Registry
          </button>
        </div>
      </div>

      {/* Analytics Bento block */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Registrations */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-xl shadow-slate-100/30 dark:shadow-none flex items-center justify-between transition-all duration-300">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Admissions</span>
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2">{stats.total}</h3>
            <p className="text-[10px] text-emerald-605 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              Live Sync
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center transition-colors">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Btech distribution stats mini bar */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-xl shadow-slate-100/30 dark:shadow-none md:col-span-3 transition-all duration-300">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-4">Registration Distribution by B.Tech Year</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            
            {[
              { label: "1st Year", count: stats.y1, color: "bg-blue-500" },
              { label: "2nd Year", count: stats.y2, color: "bg-emerald-500" },
              { label: "3rd Year", count: stats.y3, color: "bg-indigo-500" },
              { label: "4th Year", count: stats.y4, color: "bg-violet-500" },
              { label: "Graduated", count: stats.completed, color: "bg-amber-500" },
            ].map((y, idx) => {
              const pct = stats.total > 0 ? (y.count / stats.total) * 100 : 0;
              return (
                <div key={idx} className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col justify-between transition-colors duration-300">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-none">{y.label}</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">{y.count}</p>
                  </div>
                  <div className="w-full bg-slate-200/60 dark:bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div className={`h-full ${y.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}

          </div>
        </div>

      </div>

      {/* Segment Tabs Control Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800/80 pb-0.5 gap-6">
        <button
          onClick={() => {
            setActiveDashboardTab("registrations");
            setSearchTerm("");
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeDashboardTab === "registrations"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-450 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Admissions Log ({registrations.length})
        </button>
        <button
          onClick={() => {
            setActiveDashboardTab("community");
            setSearchTerm("");
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeDashboardTab === "community"
              ? "border-[#10b981] text-[#10b981] dark:border-[#10b981] dark:text-[#34d399]"
              : "border-transparent text-slate-450 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          Community Sign-ups ({communityRegistrations.length})
        </button>
        <button
          onClick={() => {
            setActiveDashboardTab("feedbacks");
            setSearchTerm("");
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeDashboardTab === "feedbacks"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-450 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Student Feedbacks ({feedbacks.length})
        </button>
      </div>

      {/* Main Table area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl shadow-xl shadow-slate-100/30 dark:shadow-none overflow-hidden transition-all duration-300">
        
        {/* Search and Filters panel */}
        <div className="p-6 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-150 dark:border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300">
          
          <div className="relative max-w-md w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeDashboardTab === "registrations" 
                  ? "Search students by name, email, department or phone..." 
                  : activeDashboardTab === "community"
                    ? "Search community by name, email, phone or promo..."
                    : "Search feedback comments, student name or email..."
              }
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-450 dark:placeholder-slate-500 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            {activeDashboardTab === "registrations" ? (
              <>
                <span className="text-slate-450 dark:text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Filter className="w-3.5 h-3.5" />
                  Filter Year:
                </span>
                <div className="flex bg-slate-200/40 dark:bg-slate-800 p-1 rounded-xl transition-colors">
                  {["All", "1", "2", "3", "4", "Completed"].map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${selectedYear === year ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
                    >
                      {year === "All" ? "All" : year === "Completed" ? "Grad" : `${year} Yr`}
                    </button>
                  ))}
                </div>
              </>
            ) : activeDashboardTab === "community" ? (
              <>
                <span className="text-slate-450 dark:text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Filter className="w-3.5 h-3.5" />
                  Status Filter:
                </span>
                <div className="flex bg-slate-200/40 dark:bg-slate-800 p-1 rounded-xl transition-colors">
                  {["All", "Pending", "Approved", "Rejected"].map((statusOption) => (
                    <button
                      key={statusOption}
                      onClick={() => setSelectedStatus(statusOption)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${selectedStatus === statusOption ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
                    >
                      {statusOption}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <span className="text-slate-450 dark:text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Star className="w-3.5 h-3.5" />
                  Satisfaction Rating:
                </span>
                <div className="flex bg-slate-200/40 dark:bg-slate-800 p-1 rounded-xl transition-colors">
                  {["All", "5", "4", "3", "2", "1"].map((ratingVal) => (
                    <button
                      key={ratingVal}
                      onClick={() => setSelectedRating(ratingVal)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${selectedRating === ratingVal ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"}`}
                    >
                      {ratingVal === "All" ? "All" : `${ratingVal} ★`}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-6 text-center text-rose-500 bg-rose-50/50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-950 text-xs font-bold leading-relaxed">
            {error}
          </div>
        )}

        {/* Success Toast Banner */}
        {successToast && (
          <div className="p-4 bg-emerald-500 text-white text-center text-xs font-extrabold flex items-center justify-center gap-2.5 shadow-md">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Dynamic Conditional Tab Displays */}
        {activeDashboardTab === "registrations" ? (
          /* List of Registrations */
          isLoading ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Loading Admissions Desk...</p>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-500 mt-2">No student registration matches the filter</p>
              <p className="text-[11px] text-slate-405 dark:text-slate-500">Awaiting your first student entry</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/20 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-155 dark:border-slate-850">
                    <th className="p-4 pl-6">Student Info</th>
                    <th className="p-4">Contact Detail</th>
                    <th className="p-4">B.Tech Year</th>
                    <th className="p-4">Department</th>
                    <th className="p-4 pr-6">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 text-xs font-medium">
                  {filteredRegistrations.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/30 transition-all duration-150">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{item.id}</div>
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-650 dark:text-slate-405">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{item.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.phone}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                          item.btechYear === "1" ? "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/40" :
                          item.btechYear === "2" ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/40" :
                          item.btechYear === "3" ? "bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/40" :
                          item.btechYear === "4" ? "bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-950/20 dark:text-violet-300 dark:border-violet-900/40" :
                          "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/40"
                        }`}>
                          <GraduationCap className="w-3.5 h-3.5" />
                          {item.btechYear === "Completed" ? "Graduate" : `${item.btechYear} Year`}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="font-bold uppercase text-slate-800 dark:text-slate-200">{item.department}</span>
                        </div>
                      </td>
                      <td className="p-4 pr-6 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{new Date(item.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeDashboardTab === "community" ? (
          /* List of Community Registrations with image screenshot view & approve actions */
          isLoading ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-8 h-8 animate-spin text-[#10b981]" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Loading WhatsApp Community Entries...</p>
            </div>
          ) : filteredCommunity.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-750" />
              <p className="text-xs font-bold text-slate-500 mt-2">No community sign-up matches this status filter</p>
              <p className="text-[11px] text-slate-450 dark:text-slate-505">Integrations sync in progress</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/20 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-155 dark:border-slate-850">
                    <th className="p-4 pl-6">applicant info</th>
                    <th className="p-4">amount paid</th>
                    <th className="p-4">screenshot</th>
                    <th className="p-4">verification status</th>
                    <th className="p-4 font-bold text-center pr-6">actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 text-xs font-medium">
                  {filteredCommunity.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/30 transition-all duration-155">
                      <td className="p-4 pl-6">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm">{item.name}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 mt-1 block">ID: {item.id}</div>
                        
                        <div className="flex flex-col gap-1.5 mt-2 text-[11px] text-slate-550 dark:text-slate-400">
                          <span className="flex items-center gap-1.5 font-bold"><Mail className="w-3.5 h-3.5 text-slate-400" /> {item.email}</span>
                          <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" /> {item.phone}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm font-black text-slate-955 dark:text-white">INR {item.amountPaid}</div>
                          {item.id && (
                            <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-lg border uppercase ${
                              item.promoApplied === "Z444" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/40" 
                                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            }`}>
                              {item.promoApplied === "Z444" ? "PROMO: Z444" : "STANDARD"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedScreenshotUrl(item.paymentScreenshot)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[10px] font-extrabold rounded-lg flex items-center gap-1.5 transition-all outline-none cursor-pointer border border-transparent dark:border-slate-800"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Image
                        </button>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.status === "approved" 
                            ? "bg-emerald-50 text-emerald-750 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/45" 
                            : item.status === "rejected"
                              ? "bg-red-50 text-red-750 border border-red-100 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/45"
                              : "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/45 animate-pulse"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.status === "approved" ? "bg-emerald-550" : item.status === "rejected" ? "bg-red-550" : "bg-amber-500 animate-ping"
                          }`} />
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6">
                        {item.status === "pending" ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              disabled={isProcessingAction !== null}
                              onClick={() => handleReviewCommunity(item.id, "approved")}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              disabled={isProcessingAction !== null}
                              onClick={() => handleReviewCommunity(item.id, "rejected")}
                              className="px-3 py-1.5 bg-red-655 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-slate-400 font-bold text-[11px] flex justify-center items-center gap-1">
                            {item.status === "approved" ? (
                              <span className="text-emerald-600 dark:text-emerald-450 flex items-center gap-1.5 font-extrabold text-xs">✓ Verified</span>
                            ) : (
                              <span className="text-red-500 flex items-center gap-1.5 font-bold text-xs">✗ Declined</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* List of Feedbacks */
          isLoading ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Loading Classroom Feedbacks...</p>
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-500 mt-2">No classroom feedback matches the filter</p>
              <p className="text-[11px] text-slate-450">Waiting for reviews from finished students</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/20 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-155 dark:border-slate-850">
                    <th className="p-4 pl-6">Student Info</th>
                    <th className="p-4">Satisfaction Rating</th>
                    <th className="p-4">Detailed Comments</th>
                    <th className="p-4">Want Community?</th>
                    <th className="p-4 pr-6">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 text-xs font-medium">
                  {filteredFeedbacks.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/30 transition-all duration-150">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{item.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${star <= item.rating ? "text-amber-400 fill-amber-400" : "text-slate-250 dark:text-slate-805"}`}
                            />
                          ))}
                          <span className="text-[10px] font-extrabold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/40 px-1.5 py-0.5 rounded ml-1.5">
                            {item.rating}/5
                          </span>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs md:max-w-md">
                        <div className="text-slate-800 dark:text-slate-205 text-[11px] leading-relaxed italic break-words bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-855/65 p-3 rounded-xl font-medium">
                          "{item.comments}"
                        </div>
                      </td>
                      <td className="p-4">
                        {item.willingToJoinCommunity ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 rounded-xl">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Yes, Keen!
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold pl-2">No Choice</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{new Date(item.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Database state indicators */}
        <div className="p-5 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-150 dark:border-slate-850 flex flex-wrap justify-between items-center gap-3 text-[11px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider transition-colors duration-300">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <span>Dual Core Storage: Active ({registrations.length} admissions, {feedbacks.length} feedbacks, {communityRegistrations.length} community sign-ups)</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Cloud Rules: Authorized & Enforced</span>
          </div>
        </div>

      </div>

      {/* Screenshot viewer full screen Modal overlay */}
      <AnimatePresence>
        {selectedScreenshotUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setSelectedScreenshotUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Transaction Screenshot Verification</h3>
                <button
                  onClick={() => setSelectedScreenshotUrl(null)}
                  className="p-1 px-2.5 rounded-lg bg-slate-200/65 dark:bg-slate-800 hover:bg-slate-300/65 text-slate-600 dark:text-slate-350 text-xs font-bold leading-normal cursor-pointer select-none"
                >
                  Close Screen
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
                <img
                  src={selectedScreenshotUrl}
                  alt="Full Payment Screenshot"
                  className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-md"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-4 border-t border-slate-150 dark:border-slate-800 text-center bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-450 font-semibold">
                Please verify details manually against the UPI transaction logs.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
