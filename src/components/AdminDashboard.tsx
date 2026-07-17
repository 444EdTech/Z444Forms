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
  Star,
  Send,
  FileText,
  FileDown,
  Link
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminDashboard() {
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [communityRegistrations, setCommunityRegistrations] = useState<any[]>([]);
  const [homeSubmissions, setHomeSubmissions] = useState<any[]>([]);
  const [selectedResume, setSelectedResume] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);
  const [isFetchingResume, setIsFetchingResume] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [activeDashboardTab, setActiveDashboardTab] = useState<"registrations" | "feedbacks" | "community" | "home_submissions">("registrations");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [isSendingForms, setIsSendingForms] = useState(false);
  const [cooldownFormsRemaining, setCooldownFormsRemaining] = useState<number>(0);
  const [selectedPreviewTemplate, setSelectedPreviewTemplate] = useState<"urgency" | "forms" | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState("444edtech@gmail.com");
  const [broadcastStatuses, setBroadcastStatuses] = useState<any>(null);
  const [sendingStates, setSendingStates] = useState<Record<string, "urgency" | "forms" | null>>({});
  const [deliveryFeedback, setDeliveryFeedback] = useState<Record<string, { status: "success" | "error"; message: string; template: "urgency" | "forms" }>>({});

  const fetchBroadcastStatus = async () => {
    try {
      const res = await fetch("/api/broadcast-status");
      const json = await res.json();
      if (res.ok && json.success) {
        setBroadcastStatuses(json.broadcasts);
      }
    } catch (err) {
      console.error("Failed to fetch broadcast statuses", err);
    }
  };

  useEffect(() => {
    const expiry = localStorage.getItem("urgency_email_cooldown_expiry");
    if (expiry) {
      const remaining = Math.max(0, Math.ceil((parseInt(expiry) - Date.now()) / 1000));
      if (remaining > 0) {
        setCooldownRemaining(remaining);
      }
    }

    const formsExpiry = localStorage.getItem("forms_email_cooldown_expiry");
    if (formsExpiry) {
      const remaining = Math.max(0, Math.ceil((parseInt(formsExpiry) - Date.now()) / 1000));
      if (remaining > 0) {
        setCooldownFormsRemaining(remaining);
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

  useEffect(() => {
    if (cooldownFormsRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownFormsRemaining((prev) => {
        if (prev <= 1) {
          localStorage.removeItem("forms_email_cooldown_expiry");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownFormsRemaining]);

  useEffect(() => {
    if (!selectedResume || !selectedResume.data) {
      setPreviewUrl(null);
      return;
    }

    const dataURI = selectedResume.data;
    if (typeof dataURI === "string" && dataURI.startsWith("data:")) {
      try {
        const parts = dataURI.split(",");
        if (parts.length >= 2) {
          const meta = parts[0];
          const base64Data = parts[1];
          const mimeMatch = meta.match(/data:([^;]+)/);
          const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
          
          // Decode base64 to raw bytes
          const binary = atob(base64Data);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
          }
          
          const blob = new Blob([array], { type: mime });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);

          // Return clean up to revoke the object URL and prevent memory leaks
          return () => {
            URL.revokeObjectURL(url);
          };
        }
      } catch (err) {
        console.error("Failed to convert data URI to blob URL:", err);
      }
    }

    setPreviewUrl(dataURI);
  }, [selectedResume]);

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

  const handleSendFormsEmail = async () => {
    if (cooldownFormsRemaining > 0) return;
    if (!window.confirm("Are you sure you want to trigger sending the Feedback and Community Registration forms to all registered students? This will dispatch an email with direct action links to everybody.")) {
      return;
    }
    
    setIsSendingForms(true);
    setError(null);
    try {
      const res = await fetch("/api/send-feedback-community-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: window.location.origin })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessToast(json.message);
        setTimeout(() => setSuccessToast(null), 8500);
        
        // Setup 10-minute cooldown (600 seconds)
        const expiryTime = Date.now() + 10 * 60 * 1000;
        localStorage.setItem("forms_email_cooldown_expiry", expiryTime.toString());
        setCooldownFormsRemaining(600);
      } else {
        setError(json.error || "Failed to trigger email forms dispatch.");
      }
    } catch (err) {
      console.error("Form email trigger failed:", err);
      setError("An error occurred while connecting to the email dispatch service.");
    } finally {
      setIsSendingForms(false);
    }
  };

  const handleSendTestEmail = async (template: "urgency" | "forms") => {
    if (!testEmailRecipient || !testEmailRecipient.includes("@")) {
      alert("Please enter a valid recipient email address.");
      return;
    }
    setIsSendingTest(true);
    setIsProcessingAction("test-email");
    try {
      const res = await fetch("/api/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          recipient: testEmailRecipient,
          origin: window.location.origin
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessToast(json.message);
        setTimeout(() => setSuccessToast(null), 8500);
      } else {
        alert(json.error || "Failed to trigger test email.");
      }
    } catch (err) {
      console.error("Test email trigger failed:", err);
      alert("An error occurred while connecting to the test email service.");
    } finally {
      setIsSendingTest(false);
      setIsProcessingAction(null);
    }
  };

  const handleSendSingleEmail = async (studentId: string, template: "urgency" | "forms") => {
    if (sendingStates[studentId]) return;

    setSendingStates(prev => ({ ...prev, [studentId]: template }));
    try {
      const res = await fetch("/api/send-single-student-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, template })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setDeliveryFeedback(prev => ({
          ...prev,
          [studentId]: { status: "success", template, message: data.message || "Email delivered successfully" }
        }));
        setSuccessToast(data.message || `Successfully sent template to student!`);
        setTimeout(() => setSuccessToast(null), 6000);
      } else {
        const errorText = data?.error || "Error dispatching individual email.";
        setDeliveryFeedback(prev => ({
          ...prev,
          [studentId]: { status: "error", template, message: errorText }
        }));
      }
    } catch (err: any) {
      console.error(err);
      setDeliveryFeedback(prev => ({
        ...prev,
        [studentId]: { status: "error", template, message: err?.message || "Network request failed" }
      }));
    } finally {
      setSendingStates(prev => ({ ...prev, [studentId]: null }));
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

  const fetchHomeSubmissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/home-submissions");
      const json = await res.json();
      if (res.ok && json.success) {
        setHomeSubmissions(json.submissions || []);
      } else {
        setError(json.error || "Failed to fetch profile submissions.");
      }
    } catch (err) {
      console.error("Local profile submissions fetch err:", err);
      setError("Failed to query profile submissions.");
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
    } else if (activeDashboardTab === "community") {
      await fetchCommunityRegistrations();
    } else {
      await fetchHomeSubmissions();
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
    fetchHomeSubmissions();
    fetchBroadcastStatus();

    const interval = setInterval(() => {
      fetchBroadcastStatus();
    }, 4000);
    return () => clearInterval(interval);
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

  const filteredHomeSubmissions = homeSubmissions.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.phone.includes(term) ||
      (item.email && item.email.toLowerCase().includes(term)) ||
      item.branch.toLowerCase().includes(term) ||
      item.collegeName.toLowerCase().includes(term) ||
      item.yearOfStudy.includes(term)
    );
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
            onClick={handleSendFormsEmail}
            disabled={isSendingForms || cooldownFormsRemaining > 0}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-60 text-xs font-extrabold rounded-xl flex items-center gap-2 border border-emerald-500/30 shadow-md cursor-pointer active:scale-95 transition-all outline-none font-bold"
          >
            <Send className={`w-3.5 h-3.5 ${isSendingForms || cooldownFormsRemaining > 0 ? "animate-pulse" : ""}`} />
            {isSendingForms 
              ? "Sending..." 
              : cooldownFormsRemaining > 0 
                ? `Resend in ${formatCooldown(cooldownFormsRemaining)}` 
                : "Send Forms Email (Feedback & Community)"
            }
          </button>

          <button
            onClick={() => setSelectedPreviewTemplate("urgency")}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white text-xs font-extrabold rounded-xl flex items-center gap-2 cursor-pointer active:scale-95 transition-all outline-none"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            Preview Templates
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

      {/* Real-time Email Campaign Progress Monitor */}
      {broadcastStatuses && (
        ((broadcastStatuses.urgency && broadcastStatuses.urgency.status !== "idle") || 
         (broadcastStatuses.forms && broadcastStatuses.forms.status !== "idle"))
      ) && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden shadow-lg shadow-slate-950/10 space-y-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    ((broadcastStatuses.urgency?.status === "running") || (broadcastStatuses.forms?.status === "running"))
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    ((broadcastStatuses.urgency?.status === "running") || (broadcastStatuses.forms?.status === "running"))
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}></span>
                </span>
                <h3 className="font-extrabold text-sm text-slate-100 tracking-tight">
                  Live SMTP Email Broadcasting Campaign Monitor
                </h3>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                Monitors active background mailing streams. A safe 1.5-second connection delay keeps your personal Gmail or custom SMTP secure from burst limits and security holds.
              </p>
            </div>
            
            <button
              onClick={fetchBroadcastStatus}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all outline-none"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Force Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* Campaign 1: Urgency reminders */}
            {broadcastStatuses.urgency && broadcastStatuses.urgency.status !== "idle" && (
              <div className="bg-slate-950/40 rounded-2xl border border-slate-850 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-indigo-400 tracking-wider uppercase">⏳ URGENCY REMINDERS CAMPAIGN</span>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${
                    broadcastStatuses.urgency.status === "running" 
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30" 
                      : broadcastStatuses.urgency.status === "completed"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-slate-800/50 text-slate-400 border-slate-700"
                  }`}>
                    {broadcastStatuses.urgency.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Progress: {broadcastStatuses.urgency.processed} / {broadcastStatuses.urgency.total} entries</span>
                    <span className="font-bold text-indigo-400">
                      {broadcastStatuses.urgency.total > 0 
                        ? Math.round((broadcastStatuses.urgency.processed / broadcastStatuses.urgency.total) * 100) 
                        : 0}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-300"
                      style={{ width: `${broadcastStatuses.urgency.total > 0 ? (broadcastStatuses.urgency.processed / broadcastStatuses.urgency.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-850/50">
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Total Checked</p>
                    <p className="text-xs font-black text-slate-300 mt-0.5">{broadcastStatuses.urgency.processed}</p>
                  </div>
                  <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-850/50">
                    <p className="text-[9px] text-emerald-500/80 font-bold uppercase">Sent Success</p>
                    <p className="text-xs font-black text-emerald-400 mt-0.5">{broadcastStatuses.urgency.sentCount}</p>
                  </div>
                  <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-850/50">
                    <p className="text-[9px] text-rose-500/80 font-bold uppercase">Errors / Skipped</p>
                    <p className="text-xs font-black text-rose-400 mt-0.5">{broadcastStatuses.urgency.failedCount}</p>
                  </div>
                </div>

                {/* Display Errors if any */}
                {broadcastStatuses.urgency.errors && broadcastStatuses.urgency.errors.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    <p className="text-[10px] font-black text-rose-400 tracking-wider uppercase">⚠️ BLOCKED / DISPATCH FAILURES ({broadcastStatuses.urgency.errors.length})</p>
                    <div className="max-h-28 overflow-y-auto bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 text-[10.5px] font-mono space-y-2 divide-y divide-rose-900/15">
                      {broadcastStatuses.urgency.errors.slice(-15).reverse().map((err: any, idx: number) => (
                        <div key={idx} className="pt-1.5 first:pt-0">
                          <span className="text-slate-300 font-bold">{err.name}</span> <span className="text-slate-500">({err.email})</span>:{" "}
                          <span className="text-rose-400">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Campaign 2: Feedback forms */}
            {broadcastStatuses.forms && broadcastStatuses.forms.status !== "idle" && (
              <div className="bg-slate-950/40 rounded-2xl border border-slate-850 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-emerald-400 tracking-wider uppercase">📝 FEEDBACK SURVEY & WhatsApp COMMUNITY</span>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${
                    broadcastStatuses.forms.status === "running" 
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30" 
                      : broadcastStatuses.forms.status === "completed"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-slate-800/50 text-slate-400 border-slate-700"
                  }`}>
                    {broadcastStatuses.forms.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Progress: {broadcastStatuses.forms.processed} / {broadcastStatuses.forms.total} entries</span>
                    <span className="font-bold text-emerald-400">
                      {broadcastStatuses.forms.total > 0 
                        ? Math.round((broadcastStatuses.forms.processed / broadcastStatuses.forms.total) * 100) 
                        : 0}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${broadcastStatuses.forms.total > 0 ? (broadcastStatuses.forms.processed / broadcastStatuses.forms.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-850/50">
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Total Checked</p>
                    <p className="text-xs font-black text-slate-300 mt-0.5">{broadcastStatuses.forms.processed}</p>
                  </div>
                  <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-850/50">
                    <p className="text-[9px] text-emerald-500/80 font-bold uppercase">Sent Success</p>
                    <p className="text-xs font-black text-emerald-400 mt-0.5">{broadcastStatuses.forms.sentCount}</p>
                  </div>
                  <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-850/50">
                    <p className="text-[9px] text-rose-500/80 font-bold uppercase">Errors / Skipped</p>
                    <p className="text-xs font-black text-rose-400 mt-0.5">{broadcastStatuses.forms.failedCount}</p>
                  </div>
                </div>

                {/* Display Errors if any */}
                {broadcastStatuses.forms.errors && broadcastStatuses.forms.errors.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    <p className="text-[10px] font-black text-rose-400 tracking-wider uppercase">⚠️ BLOCKED / DISPATCH FAILURES ({broadcastStatuses.forms.errors.length})</p>
                    <div className="max-h-28 overflow-y-auto bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 text-[10.5px] font-mono space-y-2 divide-y divide-rose-900/15">
                      {broadcastStatuses.forms.errors.slice(-15).reverse().map((err: any, idx: number) => (
                        <div key={idx} className="pt-1.5 first:pt-0">
                          <span className="text-slate-300 font-bold">{err.name}</span> <span className="text-slate-500">({err.email})</span>:{" "}
                          <span className="text-rose-400">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Bento block */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Registrations */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-xl shadow-slate-100/30 dark:shadow-none flex items-center justify-between transition-all duration-300">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Admissions</span>
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2">{stats.total}</h3>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
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
        <button
          onClick={() => {
            setActiveDashboardTab("home_submissions");
            setSearchTerm("");
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeDashboardTab === "home_submissions"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-slate-450 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Profile Submissions ({homeSubmissions.length})
        </button>
      </div>

      {/* Main Table area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl shadow-slate-100/30 dark:shadow-none overflow-hidden transition-all duration-300">
        
        {/* Search and Filters panel */}
        <div className="p-6 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300">
          
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
                  <tr className="bg-slate-50/20 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-850">
                    <th className="p-4 pl-6">Student Info</th>
                    <th className="p-4">Contact Detail</th>
                    <th className="p-4">B.Tech Year</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Submitted At</th>
                    <th className="p-4 pr-6 text-right">Direct Dispatch (One-by-One)</th>
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
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
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
                          "bg-amber-50 text-amber-750 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/40"
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
                      <td className="p-4 text-slate-500 dark:text-slate-400 text-slate-500">
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
                      <td className="p-4 pr-6">
                        <div className="flex justify-end items-center gap-2">
                          {/* Urgency Reminder single dispatch button */}
                          <button
                            onClick={() => handleSendSingleEmail(item.id, "urgency")}
                            disabled={sendingStates[item.id] !== undefined && sendingStates[item.id] !== null}
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-[10.5px] font-bold rounded-lg border cursor-pointer select-none transition-all duration-150 active:scale-95 outline-none
                              ${sendingStates[item.id] === "urgency"
                                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                                : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850"
                              }
                            `}
                            title="Send 'Few Hours Remaining' live classroom access link template"
                          >
                            {sendingStates[item.id] === "urgency" ? (
                              <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                            ) : (
                              <Clock className="w-3 h-3 text-indigo-500" />
                            )}
                            Urgency
                          </button>

                          {/* Feedback / WhatsApp Links single dispatch button */}
                          <button
                            onClick={() => handleSendSingleEmail(item.id, "forms")}
                            disabled={sendingStates[item.id] !== undefined && sendingStates[item.id] !== null}
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-[10.5px] font-bold rounded-lg border cursor-pointer select-none transition-all duration-150 active:scale-95 outline-none
                              ${sendingStates[item.id] === "forms"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850"
                              }
                            `}
                            title="Send Workshop Survey feedback & Premium WhatsApp community links template"
                          >
                            {sendingStates[item.id] === "forms" ? (
                              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                            ) : (
                              <Send className="w-3 h-3 text-emerald-500" />
                            )}
                            Feedback
                          </button>
                        </div>

                        {/* Direct delivery status notification feedback */}
                        {deliveryFeedback[item.id] && (
                          <div className={`mt-1.5 text-[10px] font-medium leading-tight flex items-start justify-end gap-1 p-1 px-1.5 rounded ${
                            deliveryFeedback[item.id].status === "success" 
                              ? "text-emerald-500 dark:text-emerald-400 bg-emerald-500/5 align-right" 
                              : "text-rose-500 dark:text-rose-400 bg-rose-500/5 align-right"
                          }`}>
                            <span className="font-extrabold shrink-0">
                              {deliveryFeedback[item.id].status === "success" ? "✓" : "⚠"}
                            </span>
                            <span className="line-clamp-1 max-w-[200px]" title={deliveryFeedback[item.id].message}>
                              {deliveryFeedback[item.id].message}
                            </span>
                          </div>
                        )}
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
                  <tr className="bg-slate-50/20 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-850">
                    <th className="p-4 pl-6">applicant info</th>
                    <th className="p-4">amount paid</th>
                    <th className="p-4">screenshot</th>
                    <th className="p-4">verification status</th>
                    <th className="p-4 font-bold text-center pr-6">actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 text-xs font-medium">
                  {filteredCommunity.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/30 transition-all duration-150">
                      <td className="p-4 pl-6">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm">{item.name}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 mt-1 block">ID: {item.id}</div>
                        
                        <div className="flex flex-col gap-1.5 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
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
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-extrabold rounded-lg flex items-center gap-1.5 transition-all outline-none cursor-pointer border border-transparent dark:border-slate-800"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Image
                        </button>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.status === "approved" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/45" 
                            : item.status === "rejected"
                              ? "bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/45"
                              : "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/45 animate-pulse"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.status === "approved" ? "bg-emerald-500" : item.status === "rejected" ? "bg-red-500" : "bg-amber-500 animate-ping"
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
        ) : activeDashboardTab === "feedbacks" ? (
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
                  <tr className="bg-slate-50/20 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-850">
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
                          <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/40 px-1.5 py-0.5 rounded ml-1.5">
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
        ) : (
          /* List of Home Submissions */
          isLoading ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Loading Profile Submissions...</p>
            </div>
          ) : filteredHomeSubmissions.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-500 mt-2">No profiles match the filter</p>
              <p className="text-[11px] text-slate-450">Waiting for candidates to submit their profiles</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/20 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-850">
                    <th className="p-4 pl-6">Student Info</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Academic details</th>
                    <th className="p-4">Resume attachment</th>
                    <th className="p-4 pr-6">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 text-xs font-medium">
                  {filteredHomeSubmissions.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/30 transition-all duration-150">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.id}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.phone}</span>
                          </div>
                          {item.email && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="break-all">{item.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="flex items-center gap-1 text-slate-800 dark:text-slate-205">
                          <span className="font-bold">{item.collegeName}</span>
                        </div>
                        <div className="text-[11px] text-slate-455 dark:text-slate-500 font-semibold flex items-center gap-1">
                          <span>{item.yearOfStudy} Year</span>
                          <span>•</span>
                          <span>{item.branch}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {(item.resumeFileBase64 || item.resume || item.hasResume) ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              disabled={isFetchingResume === item.id}
                              onClick={async () => {
                                if (item.resumeFileBase64) {
                                  let fileType = "application/pdf";
                                  if (item.resumeFileBase64.startsWith("data:image/")) {
                                    fileType = "image";
                                  }
                                  setSelectedResume({
                                    name: item.resumeFileName || "resume.pdf",
                                    data: item.resumeFileBase64,
                                    type: fileType
                                  });
                                } else if (item.resume) {
                                  setSelectedResume(item.resume);
                                } else if (item.hasResume) {
                                  // Fetch on demand
                                  setIsFetchingResume(item.id);
                                  try {
                                    const res = await fetch(`/api/submission-resume/${item.id}`);
                                    const json = await res.json();
                                    if (json.success) {
                                      let fileType = "application/pdf";
                                      if (json.resumeFileBase64?.startsWith("data:image/")) {
                                        fileType = "image";
                                      }
                                      setSelectedResume({
                                        name: json.resumeFileName || "resume.pdf",
                                        data: json.resumeFileBase64,
                                        type: fileType
                                      });
                                    } else {
                                      alert("Failed to load resume content.");
                                    }
                                  } catch (err) {
                                    console.error("Resume fetch err:", err);
                                    alert("Network error while fetching resume.");
                                  } finally {
                                    setIsFetchingResume(null);
                                  }
                                }
                              }}
                              className={`px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10.5px] rounded-lg transition-colors border border-indigo-200/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-wait`}
                            >
                              {isFetchingResume === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <FileText className="w-3.5 h-3.5" />
                              )}
                              View Resume (
                              {(item.resumeFileName || item.resume?.name) 
                                ? ((item.resumeFileName || item.resume?.name).length > 15 
                                    ? (item.resumeFileName || item.resume?.name).substring(0, 15) + '...' 
                                    : (item.resumeFileName || item.resume?.name)) 
                                : "File"
                              })
                            </button>
                            {(item.resumeFileBase64 || item.resume?.data) && (
                              <a
                                href={item.resumeFileBase64 || item.resume?.data}
                                download={item.resumeFileName || item.resume?.name || "resume.pdf"}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg transition-colors cursor-pointer border border-transparent dark:border-slate-800 flex items-center justify-center"
                                title="Download Attachment"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ) : null}

                        {item.resumeUrl ? (
                          <div className="mt-1.5">
                            <a
                              href={item.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                            >
                              <Link className="w-3.5 h-3.5" />
                              <span>Go to Link</span>
                            </a>
                          </div>
                        ) : null}

                        {!item.resumeFileBase64 && !item.resume && !item.resumeUrl ? (
                          <span className="text-slate-450 italic text-[11px]">No resume provided</span>
                        ) : null}
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
        <div className="p-5 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-850 flex flex-wrap justify-between items-center gap-3 text-[11px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider transition-colors duration-300">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <span>Dual Core Storage: Active ({registrations.length} admissions, {feedbacks.length} feedbacks, {communityRegistrations.length} community sign-ups, {homeSubmissions.length} profile submissions)</span>
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

      {/* Resume Viewer overlay Modal */}
      <AnimatePresence>
        {selectedResume && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setSelectedResume(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Resume Viewer: {selectedResume.name || "resume.pdf"}
                  </h3>
                  <span className="text-[10px] text-slate-450 mt-0.5">Format: {selectedResume.type || "Unknown type"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedResume.data}
                    download={selectedResume.name || "resume.pdf"}
                    className="p-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold leading-normal flex items-center gap-1 cursor-pointer select-none"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Download File
                  </a>
                  <button
                    onClick={() => setSelectedResume(null)}
                    className="p-1.5 px-3 rounded-lg bg-slate-200/65 dark:bg-slate-800 hover:bg-slate-300/65 text-slate-600 dark:text-slate-355 text-xs font-bold leading-normal cursor-pointer select-none"
                  >
                    Close Viewer
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 flex flex-col p-4">
                {selectedResume.type?.includes("pdf") ? (
                  <iframe
                    src={previewUrl || selectedResume.data}
                    className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800"
                    title="PDF Document"
                  />
                ) : selectedResume.type?.includes("image") ? (
                  <div className="flex items-center justify-center w-full h-full p-4">
                    <img
                      src={previewUrl || selectedResume.data}
                      alt="Uploaded Resume"
                      className="max-w-full max-h-full object-contain rounded-xl shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="m-auto text-center p-8 max-w-sm space-y-3">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Preview Unavailable</p>
                    <p className="text-[11px] text-slate-450">This file cannot be previewed directly. Please download the file to view its full contents.</p>
                    <a
                      href={selectedResume.data}
                      download={selectedResume.name || "resume.pdf"}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" />
                      Download Resume File
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Template Preview Modal overlay */}
      <AnimatePresence>
        {selectedPreviewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setSelectedPreviewTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 text-white rounded-3xl overflow-hidden border border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950">
                <div>
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    Interactive Email Dispatch Preview
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Simulated display of templates delivered to candidates</p>
                </div>
                
                <div className="flex bg-slate-800 p-1 rounded-xl shrink-0 self-start sm:self-center">
                  <button
                    onClick={() => setSelectedPreviewTemplate("urgency")}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${selectedPreviewTemplate === "urgency" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                  >
                    ⏰ Urgency Reminder
                  </button>
                  <button
                    onClick={() => setSelectedPreviewTemplate("forms")}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${selectedPreviewTemplate === "forms" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                  >
                    📝 Feedback & Community
                  </button>
                </div>
              </div>

              {/* Simulated Mail Client Header */}
              <div className="bg-slate-950/60 p-4 border-b border-slate-800/80 text-xs font-medium space-y-1.5 text-slate-350">
                <div>
                  <span className="text-slate-500 mr-2 uppercase tracking-wider text-[9px] font-bold">From:</span>
                  <span className="text-white font-semibold">
                    {selectedPreviewTemplate === "urgency" ? "Z444 Masterclass Team" : "Z444 EdTech Operations Team"}
                  </span>{" "}
                  &lt;444edtech@gmail.com&gt;
                </div>
                <div>
                  <span className="text-slate-500 mr-2 uppercase tracking-wider text-[9px] font-bold">To:</span>
                  <span className="text-indigo-300 font-mono">candidate-inbox@gmail.com</span>
                </div>
                <div className="flex items-start">
                  <span className="text-slate-500 mr-2 uppercase tracking-wider text-[9px] font-bold mt-0.5">Subject:</span>
                  <span className="text-slate-100 font-bold">
                    {selectedPreviewTemplate === "urgency" 
                      ? "⏳ [Few Hours Remaining] Z444 Masterclass Live Starts Today at 11:00 AM IST!" 
                      : "📝 Z444 Masterclass Feedback & Premium WhatsApp Community Admission Link"
                    }
                  </span>
                </div>
              </div>

              {/* Scrollable Email Body with frame */}
              <div className="flex-1 overflow-auto p-6 bg-slate-950 text-slate-900">
                {selectedPreviewTemplate === "urgency" ? (
                  /* Urgency Reminder Preview Card */
                  <div className="bg-white rounded-xl overflow-hidden shadow-xl border border-slate-200/60 max-w-[560px] mx-auto text-left text-sm leading-relaxed text-slate-800">
                    <div className="bg-indigo-600 p-6 text-center text-white">
                      <h1 className="margin-0 text-xl font-extrabold tracking-tight">Z444 Live in a Few Hours! 🚀</h1>
                      <p className="opacity-85 text-xs mt-1 font-semibold">Bridging the Gap: College Studies to Industry Job Expectations</p>
                    </div>
                    <div className="p-6 space-y-4">
                      <p>Hello <strong>John Doe</strong>,</p>
                      <p>This is a quick direct call! The highly anticipated <strong>Z444 Masterclass</strong> is starting in just a few hours. Make sure you don't miss this live training masterclass.</p>

                      <div className="bg-indigo-50/50 border-l-4 border-indigo-500 p-4 rounded-r-lg space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">🔥 ACCESS INFORMATION:</p>
                        <p className="text-slate-800 text-xs md:text-sm">
                          ⏰ <strong>Time:</strong> Today, Sunday at 11:00 AM Indian Standard Time (IST) Sharp<br/>
                          📍 <strong>Venue:</strong> Google Meet Live Classroom<br/>
                          🔗 <strong>Direct Joining link:</strong>{" "}
                          <a 
                            href="https://meet.google.com/bwi-xehm-peg" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-indigo-600 font-bold underline hover:text-indigo-800 cursor-pointer"
                          >
                            https://meet.google.com/bwi-xehm-peg
                          </a>
                        </p>
                      </div>

                      <p className="font-bold text-slate-900">What to prepare and keep handy:</p>
                      <ul className="list-disc pl-5 space-y-1 text-slate-700 text-xs md:text-sm">
                        <li>A notepad, notebook, or pen to take rapid tactical notes.</li>
                        <li>Be in an environment with high-speed internet capability.</li>
                      </ul>

                      <p className="text-xs text-slate-500 italic">
                        <strong>Note:</strong> Log in at least 5 minutes early to secure your spot and avoid capacity constraints on Google Meet.
                      </p>

                      <hr className="border-t border-slate-100" />
                      <div>
                        <p className="text-xs text-slate-500 mb-0">
                          Warm regards,<br/>
                          <strong>Z444 Masterclass Team</strong><br/>
                          <span className="text-[10px] text-slate-400">Direct Support: 444edtech@gmail.com</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Feedback & Community Form Links Card */
                  <div className="bg-white rounded-xl overflow-hidden shadow-xl border border-slate-200/60 max-w-[560px] mx-auto text-left text-sm leading-relaxed text-slate-800">
                    <div className="bg-indigo-600 p-6 text-center text-white">
                      <h1 className="margin-0 text-xl font-extrabold tracking-tight">Z444 Workshop Survey & Community 🚀</h1>
                      <p className="opacity-85 text-xs mt-1 font-semibold">Your Opinion Matters & Stay Connected! Bridging academia to true industry expectations.</p>
                    </div>
                    <div className="p-6 space-y-4">
                      <p>Hello <strong>John Doe</strong>,</p>
                      <p>Thank you for participating in the <strong>Z444 Masterclass</strong>! To help us improve and continue delivering high-impact workshops, please take 1 minute to fill out our quick reflection and feedback form. In addition, you can now apply to join our exclusive, premium WhatsApp Community!</p>

                      <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-center space-y-2">
                        <p className="font-black text-xs text-indigo-600 uppercase tracking-wider">📝 SHARE YOUR FEEDBACK</p>
                        <p className="text-[11px] text-slate-500">Submit your honest feedback, satisfaction rating, and comments about your experience.</p>
                        <a 
                          href="https://www.z444.co.in/feedbackform" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md cursor-pointer transition-all active:scale-95"
                        >
                          Fill Out Feedback Form
                        </a>
                      </div>

                      <div className="bg-emerald-50/50 border border-emerald-200 p-5 rounded-xl text-center space-y-2">
                        <p className="font-black text-xs text-emerald-600 uppercase tracking-wider">💬 JOIN THE PREMIUM COMMUNITY</p>
                        <p className="text-[11px] text-slate-600">Get direct access to expert guidance, resumes templates, premium job referrals, and live peer chats for INR 244!</p>
                        <a 
                          href="https://www.z444.co.in/community" 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md cursor-pointer transition-all active:scale-95"
                        >
                          Apply to Premium Community
                        </a>
                      </div>

                      <p className="text-xs text-slate-500">
                        Should you have any queries or need specialized assistance during the registration, feel free to reply directly to this email.
                      </p>

                      <hr className="border-t border-slate-100" />
                      <div>
                        <p className="text-xs text-slate-500 mb-0">
                          Warm regards,<br/>
                          <strong>Z444 EdTech Operations Team</strong><br/>
                          <span className="text-[10px] text-slate-400">Direct Support: 444edtech@gmail.com</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Test Email Dispatch Interface Box */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="space-y-1">
                    <span className="inline-block bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Live Delivery Tool
                    </span>
                    <h4 className="text-[11px] font-black text-white uppercase tracking-wider">
                      Send inbox test to {testEmailRecipient === "444edtech@gmail.com" ? "Owner" : "Recipient"} ✉️
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Delivers a copy of this exact layout directly to your email inbox so you can check and click live buttons.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      required
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      className="bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-56"
                      placeholder="Enter recipient email..."
                    />
                    <button
                      onClick={() => handleSendTestEmail(selectedPreviewTemplate)}
                      disabled={isSendingTest}
                      className="bg-indigo-600 hover:bg-indigo-550 disabled:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-lg shadow-indigo-900/30 active:scale-95"
                    >
                      {isSendingTest ? "Sending..." : "Send Test"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer action */}
              <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950 text-xs">
                <span className="text-[10px] text-slate-500 font-mono">
                  Mode: Live Interactive Preview Card View
                </span>
                <button
                  onClick={() => setSelectedPreviewTemplate(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
